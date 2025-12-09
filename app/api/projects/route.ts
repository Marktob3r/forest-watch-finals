import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      description,
      objectives,
      image_url,
      country,
      region,
      coordinates,
      area_target,
      area_unit,
      trees_target,
      species,
      partners,
      start_date,
      end_date,
      estimated_duration,
    } = body || {};

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const id = crypto.randomUUID();
    const row = {
      id,
      name: name.trim(),
      description: description || null,
      objectives: objectives || null,
      image_url: image_url || null,
      country: country || null,
      region: region || null,
      coordinates: coordinates || null,
      area_target: area_target ?? null,
      area_unit: area_unit || 'hectares',
      trees_target: trees_target ?? null,
      species: Array.isArray(species) ? species : [],
      partners: Array.isArray(partners) ? partners : [],
      start_date: start_date || null,
      end_date: end_date || null,
      estimated_duration: estimated_duration || null,
      status: 'draft',
      progress: 0,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from('projects').insert(row).select().single();
    if (error) {
      return NextResponse.json({ error: error.message || 'Failed to create project' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, project: data }, { status: 201 });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function GET() {
  try {
    const supabase = getServiceSupabase();
    // Select a safe set of columns. Some deployments may not have derived columns
    // like `area_planted`, `trees_planted`, or `carbon_sequestered` yet, which
    // would cause a DB error if requested explicitly. Fetch a conservative
    // column list and map aliases below.
    const { data, error } = await supabase.from('projects').select(`id, name, country, region, coordinates, area_target, area_unit, trees_target, species, partners, start_date, status, progress, created_at`).order('created_at', { ascending: false }).limit(200);
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch projects', error);
      return NextResponse.json({ error: 'Failed to load projects' }, { status: 500 });
    }
    // Normalize DB snake_case -> camelCase for frontend convenience
    const parseDurationToDays = (s: any) => {
      if (!s || typeof s !== 'string') return 365 * 5; // default 5 years
      const m = s.match(/(\d+(?:\.\d+)?)\s*(year|years|yr|yrs|month|months|mo|mos|week|weeks|day|days)/i);
      if (!m) return 365 * 5;
      const v = Number(m[1]);
      const unit = (m[2] || '').toLowerCase();
      if (unit.startsWith('year') || unit.startsWith('yr')) return Math.round(v * 365);
      if (unit.startsWith('month') || unit === 'mo') return Math.round(v * 30);
      if (unit.startsWith('week')) return Math.round(v * 7);
      if (unit.startsWith('day')) return Math.round(v);
      return Math.round(v * 365);
    };

    const msPerDay = 24 * 60 * 60 * 1000;
    const now = Date.now();

    const projects = (data || []).map((r: any) => {
      const areaTarget = r.area_target ?? r.areaTarget ?? 0;
      const treesTarget = r.trees_target ?? r.treesTarget ?? 0;
      const estimated = r.estimated_duration || r.estimatedDuration || null;
      const start = r.start_date || r.startDate || null;

      let fraction = 0;
      if (start) {
        try {
          const startMs = new Date(String(start)).getTime();
          const durDays = parseDurationToDays(estimated);
          const elapsedDays = Math.max(0, (now - startMs) / msPerDay);
          fraction = durDays > 0 ? Math.min(1, elapsedDays / durDays) : 0;
        } catch (e) { fraction = 0; }
      }

      const areaPlanted = Math.round(Number(areaTarget) * fraction);
      const treesPlanted = Math.round(Number(treesTarget) * fraction);
      // rough carbon estimate per tree (tonnes): 0.05 t/tree
      const carbonSequestered = Math.round(treesPlanted * 0.05 * 10) / 10;
      const progress = Math.round(fraction * 100);

      return {
        // keep original shape but add camelCase aliases
        ...r,
        id: r.id,
        name: r.name,
        country: r.country,
        region: r.region,
        coordinates: r.coordinates,
        areaTarget: areaTarget,
        areaUnit: r.area_unit ?? r.areaUnit,
        treesTarget: treesTarget,
        species: r.species ?? r.species,
        partners: r.partners ?? r.partners,
        startDate: start,
        status: r.status,
        progress: progress,
        areaPlanted,
        treesPlanted,
        carbonSequestered,
        createdAt: r.created_at ?? r.createdAt,
      };
    });

    // Simple placeholder carbon trend (6 months) — replace with real pipeline later
    const carbonTrend = [
      { month: 'Jul', carbon: 2156 },
      { month: 'Aug', carbon: 2398 },
      { month: 'Sep', carbon: 2645 },
      { month: 'Oct', carbon: 2890 },
      { month: 'Nov', carbon: 3142 },
      { month: 'Dec', carbon: 3421 },
    ];

    return NextResponse.json({ ok: true, projects, carbonTrend });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
