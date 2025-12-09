import { NextResponse } from 'next/server';
import { findUserByEmail, verifyPassword, createToken, updateUserById } from '@/lib/auth';
import { discoverResources } from '@/lib/ai/discover';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const user = await findUserByEmail(email);
    if (!user) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

    if (!user.verified) {
      return NextResponse.json({ error: 'Email not verified', code: 'email_not_verified' }, { status: 403 });
    }

    const ok = verifyPassword(password, user.salt, user.passwordHash);
    if (!ok) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

    const token = createToken({ userId: user.id, email: user.email });

    // Build a small personalized query for recommendations. Keep it lightweight.
    const baseTopics = ['forest monitoring', 'reforestation', 'NDVI', 'deforestation detection'];
    const locationHint = user.location ? ` ${user.location}` : '';
    const query = `${baseTopics.join(', ')}${locationHint}`;

    // Fetch recommendations but don't fail login if discovery fails.
    let recommendations = [] as any[];
    try {
      const items = await discoverResources(query);
      recommendations = (items || []).slice(0, 8);
      // Persist recommendations to user's record so they are available on /api/auth/me
      try {
        await updateUserById(user.id, { recommendations });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Failed to persist recommendations', e);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Discovery failed at login', e);
    }

    // Return token and recommendations. In production use secure HttpOnly cookies for token.
    return NextResponse.json({ ok: true, token, recommendations }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
