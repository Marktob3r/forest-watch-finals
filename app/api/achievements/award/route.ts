import { NextResponse } from 'next/server';
import { verifyToken, awardAchievementToUser, findUserById } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload || !payload.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const achievementId = String(body?.achievementId || '');
    if (!achievementId) return NextResponse.json({ error: 'Missing achievementId' }, { status: 400 });

    const supabase = getServiceSupabase();
    const { data: achRow, error: achErr } = await supabase.from('achievements').select('id').eq('id', achievementId).limit(1).maybeSingle();
    if (achErr) {
      // eslint-disable-next-line no-console
      console.error('Failed to query achievements', achErr);
      return NextResponse.json({ error: 'Failed to validate achievement' }, { status: 500 });
    }
    if (!achRow) return NextResponse.json({ error: 'Unknown achievement' }, { status: 400 });

    const user = await findUserById(payload.userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const res = await awardAchievementToUser(payload.userId, achievementId);
    if (!res.ok) return NextResponse.json({ error: res.reason || 'Failed' }, { status: 400 });

    return NextResponse.json({ ok: true, achievement: res.achievement });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
