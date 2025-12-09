import { NextResponse } from 'next/server';
import { discoverResources } from '@/lib/ai/discover';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const query = String(body?.query || '').trim();
    const types: string[] = body?.types || ['articles', 'videos', 'guides'];
    if (!query) return NextResponse.json({ ok: false, error: 'Missing query' }, { status: 400 });

    const items = await discoverResources(query, types);
    return NextResponse.json({ ok: true, items });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}
