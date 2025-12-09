import { NextResponse } from 'next/server';
import { resetPasswordWithCode } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, code, password } = body;
    if (!email || !code || !password) return NextResponse.json({ error: 'Email, code and password are required' }, { status: 400 });

    const res = await resetPasswordWithCode(email, String(code), String(password));
    if (!res.ok) {
      return NextResponse.json({ ok: false, reason: res.reason }, { status: 400 });
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
