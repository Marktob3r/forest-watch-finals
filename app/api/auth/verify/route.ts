import { NextResponse } from 'next/server';
import { findUserByEmail, verifyUserByCode, createToken } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, code } = body;
    if (!email || !code) return NextResponse.json({ error: 'Email and code are required' }, { status: 400 });

    const user = await findUserByEmail(email);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const result = await verifyUserByCode(email, String(code));
    if (!result.ok) {
      const map: Record<string, number> = { expired: 400, mismatch: 400, no_code: 400, not_found: 404 };
      const status = typeof result.reason === 'string' && map[result.reason] ? map[result.reason] : 400;
      return NextResponse.json({ ok: false, reason: result.reason }, { status });
    }

    if (!result.user) {
      return NextResponse.json({ ok: false, error: 'user_not_found_after_verify' }, { status: 500 });
    }

    // Create a session token (dev flow)
    const token = createToken({ userId: result.user.id, email: result.user.email });
    return NextResponse.json({ ok: true, token }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
