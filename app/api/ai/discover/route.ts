import { NextResponse } from 'next/server';
import { discoverResources } from '@/lib/ai/discover';
import { safeGet, safeSet } from '@/lib/redis';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const query = String(body?.query || '').trim();
    const types: string[] = body?.types || ['articles', 'videos', 'guides'];
    if (!query) return NextResponse.json({ ok: false, error: 'Missing query' }, { status: 400 });

    const cacheKey = `discover:${crypto.createHash('sha1').update(query + types.join(',')).digest('hex')}`;

    // Try Redis cache first (fast). If Redis unavailable, safeGet returns null.
    const cached = await safeGet(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return NextResponse.json({ ok: true, items: parsed, cached: true });
      } catch (e) {
        // ignore parse errors and continue
      }
    }

    const items = await discoverResources(query, types);

    // Best-effort cache the results in Redis for short TTL (5 minutes)
    try {
      await safeSet(cacheKey, JSON.stringify(items), 300);
    } catch (e) {
      // ignore cache write errors
    }

    return NextResponse.json({ ok: true, items });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}
