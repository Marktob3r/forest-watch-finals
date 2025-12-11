import { NextResponse } from 'next/server';
import { getServiceSupabase } from '../../../lib/supabase';
import callGemini from '../../../lib/ai/generate';
import { safeGet, safeSet } from '../../../lib/redis';

// Server-side dashboard endpoint. Aggregates basic stats from the database
// and (optionally) calls the configured Gemini model to produce textual
// insights about forest coverage, land use distribution and environmental
// conditions. The endpoint always returns aggregated stats even if the AI
// call is not available or fails.
export async function GET() {
  try {
    const supabase = getServiceSupabase();

    // Aggregate project metrics
    const { data: projects } = await supabase
      .from('projects')
      .select('area_target,area_planted,trees_target,trees_planted')
      .limit(1000);

    const totalAreaTarget = (projects || []).reduce((s: number, p: any) => s + (Number(p?.area_target) || 0), 0);
    const totalAreaPlanted = (projects || []).reduce((s: number, p: any) => s + (Number(p?.area_planted) || 0), 0);
    const totalTreesTarget = (projects || []).reduce((s: number, p: any) => s + (Number(p?.trees_target) || 0), 0);
    const totalTreesPlanted = (projects || []).reduce((s: number, p: any) => s + (Number(p?.trees_planted) || 0), 0);

    // Alerts: active (status = 'open') and breakdown by severity
    const { data: alerts } = await supabase.from('alerts').select('id,severity,status').limit(1000);
    const activeAlerts = (alerts || []).filter((a: any) => !a?.status || a.status === 'open').length;
    const alertsBreakdown: Record<string, number> = {};
    (alerts || []).forEach((a: any) => {
      const sev = a?.severity || 'unknown';
      alertsBreakdown[sev] = (alertsBreakdown[sev] || 0) + 1;
    });

    // Environmental: pull recent region measurements and compute simple averages
    const { data: measurements } = await supabase
      .from('region_measurements')
      .select('ndvi,temperature,humidity,soil')
      .order('measured_at', { ascending: false })
      .limit(200);

    const env = { ndvi: null as number | null, soilMoisture: null as number | null, temperature: null as number | null, humidity: null as number | null };
    if (measurements && measurements.length > 0) {
      let ndviSum = 0, tempSum = 0, humSum = 0, soilSum = 0, soilCount = 0;
      measurements.forEach((m: any) => {
        if (typeof m.ndvi === 'number') ndviSum += Number(m.ndvi);
        if (typeof m.temperature === 'number') tempSum += Number(m.temperature);
        if (typeof m.humidity === 'number') humSum += Number(m.humidity);
        if (m.soil && typeof m.soil === 'object' && m.soil.moisture != null) {
          const val = Number(m.soil.moisture);
          if (!Number.isNaN(val)) { soilSum += val; soilCount += 1; }
        }
      });
      env.ndvi = ndviSum ? +(ndviSum / measurements.length) : null;
      env.temperature = tempSum ? +(tempSum / measurements.length) : null;
      env.humidity = humSum ? +(humSum / measurements.length) : null;
      env.soilMoisture = soilCount ? +(soilSum / soilCount) : null;
    }

    const stats = {
      totalAreaTarget,
      totalAreaPlanted,
      totalTreesTarget,
      totalTreesPlanted,
      activeAlerts,
      alertsBreakdown,
      // user-facing labels kept for frontend compatibility
      forestCoverage: totalAreaTarget ? `${totalAreaPlanted}/${totalAreaTarget} ha` : null,
      reforestationHectares: totalAreaPlanted || null,
      carbon: totalTreesPlanted ? `${Math.round(totalTreesPlanted * 0.05 * 10) / 10} t` : null,
    } as any;

    // Retrieve a short list of projects to include in the AI prompt (name + numeric fields)
    const { data: projectList } = await supabase
      .from('projects')
      .select('id,name,country,area_target,area_planted,progress')
      .order('created_at', { ascending: false })
      .limit(20);

    const projectSummary = (projectList || []).map((p: any) => `- ${p.name || p.id} | country: ${p.country || 'N/A'} | area_target: ${p.area_target ?? 0} | area_planted: ${p.area_planted ?? 0} | progress: ${p.progress ?? 0}`).join('\n');

    // Prepare a prompt that requests machine-readable JSON containing numeric
    // analysis fields (aiStats) so the frontend can render numbers into
    // placeholders reliably.
    const prompt = `You are an environmental data analyst. Given the aggregated statistics and the recent project list below, produce a JSON object with two top-level keys: "aiStats" and "insights".\n\nRequirements for aiStats (numbers):\n- totalAreaTarget (number, hectares)\n- totalAreaPlanted (number, hectares)\n- percentComplete (number, 0-100)\n- totalTreesPlanted (number)\n- activeAlerts (number)\n- topProjects: array of up to 3 objects { id, name, progress (0-100), areaPlanted }\n- landUseDistribution: array of { name, percent } (sum to ~100)\n\nRequirements for insights: a short human-readable paragraph (2-4 sentences) summarizing: Forest Coverage, Land Use, Environmental Conditions and one short recommendation.\n\nAggregated statistics:\n- totalAreaTarget: ${totalAreaTarget}\n- totalAreaPlanted: ${totalAreaPlanted}\n- totalTreesTarget: ${totalTreesTarget}\n- totalTreesPlanted: ${totalTreesPlanted}\n- activeAlerts: ${activeAlerts}\n- avg_ndvi: ${env.ndvi ?? 'N/A'}\n- avg_soil_moisture: ${env.soilMoisture ?? 'N/A'}\n- avg_temperature: ${env.temperature ?? 'N/A'}\n- avg_humidity: ${env.humidity ?? 'N/A'}\n\nRecent projects:\n${projectSummary}\n\nIMPORTANT: Return ONLY valid JSON (no surrounding markdown). Ensure numeric fields are numbers, not strings. Keep arrays compact. Example valid output: {"aiStats": {"totalAreaTarget": 100, "totalAreaPlanted": 25, "percentComplete": 25, "totalTreesPlanted": 5000, "activeAlerts": 2, "topProjects": [{"id":"...","name":"...","progress":80,"areaPlanted":50}], "landUseDistribution": [{"name":"Forest","percent":70}]}, "insights": "Forest Coverage: ..." }`;

    let aiInsights: string | null = null;
    let aiRaw: string | null = null;
    let aiError: string | null = null;

    const ttlSeconds = Number(process.env.AI_INSIGHTS_TTL_SECONDS || 3600);
    try {
      // Prefer Redis cache when available (fast, optional). Falls back to DB cache.
      const r = await safeGet('dashboard_latest');
      if (r) {
        try {
          const parsed = JSON.parse(r);
          const ageSec = parsed?.ts ? (Date.now() - Number(parsed.ts)) / 1000 : 0;
          if (ageSec >= 0 && ageSec < ttlSeconds) {
            aiInsights = parsed.insights ?? null;
            aiRaw = parsed.raw ?? null;
          }
        } catch (e) {
          // ignore parse errors and continue
        }
      } else {
        // fallback to DB-stored cache if Redis unavailable or empty
        const cached = await supabase
          .from('ai_insights')
          .select('insights,raw,created_at')
          .eq('key', 'dashboard_latest')
          .limit(1)
          .maybeSingle();

        if (cached && !cached.error && cached.data) {
          const row = cached.data as any;
          const created = row.created_at ? new Date(row.created_at).getTime() : 0;
          const ageSec = (Date.now() - created) / 1000;
          if (ageSec >= 0 && ageSec < ttlSeconds) {
            aiInsights = row.insights ?? null;
            aiRaw = row.raw ?? null;
          }
        }
      }
    } catch (e) {
      // ignore cache read errors and continue to call AI
    }

    // If not cached, call the model and persist result (best-effort).
    let aiStats: any = null;
    if (!aiInsights) {
      try {
        const aiText = await callGemini(prompt, 800);
        if (aiText) {
          aiRaw = aiText;
          // Try to parse JSON from the model output
          try {
            const jsonStart = aiText.indexOf('{');
            const jsonStr = jsonStart >= 0 ? aiText.slice(jsonStart) : aiText;
            const parsed = JSON.parse(jsonStr);
            if (parsed && parsed.aiStats) {
              aiStats = parsed.aiStats;
              aiInsights = parsed.insights ?? null;
            } else if (parsed && parsed.insights) {
              aiInsights = parsed.insights;
            } else {
              // fallback: treat whole text as insights
              aiInsights = aiText.trim();
            }
          } catch (pe) {
            // parsing failed — keep raw text as insights
            aiInsights = aiText.trim();
          }

          // Best-effort: persist into `ai_insights` (table may not exist).
          try {
            await supabase.from('ai_insights').upsert({
              key: 'dashboard_latest',
              insights: aiInsights,
              raw: aiRaw,
              stats: aiStats ?? stats,
              created_at: new Date().toISOString(),
            });
            // Also write a small Redis cache if available
            try {
              const payload = JSON.stringify({ insights: aiInsights, raw: aiRaw, stats: aiStats ?? stats, ts: Date.now() });
              await safeSet('dashboard_latest', payload, ttlSeconds);
            } catch (e) {
              // ignore redis write errors
            }
          } catch (e) {
            // ignore persistence errors
          }
        }
      } catch (e: any) {
        // preserve error but don't fail the whole request
        // eslint-disable-next-line no-console
        console.error('AI call failed', e);
        aiError = String(e?.message || e);
      }
    }

    const payload = {
      ok: true,
      stats,
      aiStats: aiStats || null,
      forestCoverageData: [],
      landUseData: [],
      recentAlerts: alerts || [],
      environmental: {
        ndvi: env.ndvi,
        soilMoisture: env.soilMoisture,
        temperature: env.temperature,
        humidity: env.humidity,
      },
      aiInsights,
      aiRaw,
      aiError,
    };

    return NextResponse.json(payload);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to handle /api/dashboard', err);
    return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 });
  }
}
