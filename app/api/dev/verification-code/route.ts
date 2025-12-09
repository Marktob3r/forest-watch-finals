import { NextResponse } from 'next/server';
import { findUserByEmail } from '@/lib/auth';

// Dev-only helper: return the last verification code for a given email.
// IMPORTANT: This endpoint must NOT be enabled in production.
export async function GET(req: Request) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
    }

    const url = new URL(req.url);
    const email = url.searchParams.get('email');
    if (!email) return NextResponse.json({ error: 'email query param required' }, { status: 400 });

    const user = await findUserByEmail(email);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Return verification fields (dev only). Do not use in production.
    return NextResponse.json({ ok: true, verificationCode: user.verificationCode ?? null, verificationExpires: user.verificationExpires ?? null }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
