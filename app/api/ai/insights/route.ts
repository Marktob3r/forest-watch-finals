import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { callGemini } from '@/lib/ai/generate';

function parseDurationToDays(s: any) {
  if (!s || typeof s !== 'string') return 365 * 5;
  const m = s.match(/(\d+(?:\.\d+)?)\s*(year|years|yr|yrs|month|months|mo|mos|week|weeks|day|days)/i);
  if (!m) return 365 * 5;
  const v = Number(m[1]);
  const unit = (m[2] || '').toLowerCase();
  if (unit.startsWith('year') || unit.startsWith('yr')) return Math.round(v * 365);
  if (unit.startsWith('month') || unit === 'mo') return Math.round(v * 30);
  if (unit.startsWith('week')) return Math.round(v * 7);
  if (unit.startsWith('day')) return Math.round(v);
  return Math.round(v * 365);
}

export async function POST(req: Request) {
  try {
    const supabase = getServiceSupabase();

    // Aggregate some project-level stats
    const { data: projects } = await supabase.from('projects').select('id, name, area_target, trees_target, start_date, estimated_duration, country, region, coordinates').limit(200);

    const now = Date.now();
    const msPerDay = 24 * 60 * 60 * 1000;
    let totalAreaTarget = 0;
    let totalTreesTarget = 0;
    let totalAreaPlanted = 0;
    let totalTreesPlanted = 0;

    for (const p of projects || []) {
      const areaTarget = Number(p.area_target || 0);
      const treesTarget = Number(p.trees_target || 0);
      totalAreaTarget += areaTarget;
      totalTreesTarget += treesTarget;
      let fraction = 0;
      if (p.start_date) {
        try {
          const startMs = new Date(String(p.start_date)).getTime();
          const durDays = parseDurationToDays(p.estimated_duration);
          const elapsedDays = Math.max(0, (now - startMs) / msPerDay);
          fraction = durDays > 0 ? Math.min(1, elapsedDays / durDays) : 0;
        } catch (e) { fraction = 0; }
      }
      totalAreaPlanted += Math.round(areaTarget * fraction);
      totalTreesPlanted += Math.round(treesTarget * fraction);
    }

    // Recent alerts
    const { data: alerts } = await supabase.from('alerts').select('id, type').order('created_at', { ascending: false }).limit(10);
    const activeAlerts = alerts?.length || 0;

    // Build a prompt for Gemini
    const prompt = `You are a domain expert in forest monitoring and restoration. Given the following aggregated telemetry, provide a concise insights summary (3-6 short bullet points), highlight any risks or anomalies, and suggest 3 prioritized actions an operations team should take. Be specific and actionable.

Projects: ${projects?.length || 0} projects
Total target area (ha): ${totalAreaTarget}
Estimated area planted so far (ha): ${totalAreaPlanted}
Total target trees: ${totalTreesTarget}
Estimated trees planted so far: ${totalTreesPlanted}
Active recent alerts count: ${activeAlerts}

Also include a one-sentence confidence level and a short rationale for each suggested action.
Output JSON with keys: summary (string), bullets (array of strings), actions (array of { action:string, priority:1|2|3, rationale:string }), confidence:string
`;

    const aiText = await callGemini(prompt, 800);

    // Try to parse JSON from response (if available)
    let parsed: any = null;
    let aiError: string | null = null;
    if (aiText) {
      try {
        const idx = aiText.indexOf('{');
        const jsonText = idx >= 0 ? aiText.slice(idx) : aiText;
        parsed = JSON.parse(jsonText);
      } catch (e) {
        // keep raw text if parsing fails
        parsed = null;
        aiError = 'AI returned non-JSON response';
      }
    } else {
      aiError = 'AI service unavailable';
    }

    const statsOut = {
      projects: projects?.length || 0,
      totalAreaTarget,
      totalAreaPlanted,
      totalTreesTarget,
      totalTreesPlanted,
      activeAlerts,
    };
    return NextResponse.json({ ok: true, insights: parsed, raw: aiText || null, stats: statsOut, aiError });
  } catch (err: any) {
    console.error('AI insights failed', err);
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, message: 'POST to generate insights' });
}
