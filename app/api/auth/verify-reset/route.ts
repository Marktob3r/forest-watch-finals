import { NextResponse } from 'next/server';
import { verifyResetCode } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, code } = body;
    if (!email || !code) return NextResponse.json({ error: 'Email and code are required' }, { status: 400 });

    const res = await verifyResetCode(email, String(code));
    if (!res.ok) {
      return NextResponse.json({ ok: false, reason: res.reason }, { status: 400 });
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
