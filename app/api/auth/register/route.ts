import { NextResponse } from 'next/server';
import { hashPassword, createUser, findUserByEmail, generateVerificationCodeForUser } from '@/lib/auth';

const SENDGRID_API = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || '';

async function sendWithSendGrid(toEmail: string, code: string) {
  if (!SENDGRID_API || !FROM_EMAIL) return { ok: false, error: 'missing_sendgrid_config' };

  const payload = {
    personalizations: [
      {
        to: [{ email: toEmail }],
        subject: 'Your Forest Watch verification code',
      },
    ],
    from: { email: FROM_EMAIL, name: 'Forest Watch' },
    content: [
      { type: 'text/plain', value: `Your Forest Watch verification code is ${code}. It expires in 15 minutes.` },
      { type: 'text/html', value: `<p>Your Forest Watch verification code is <strong>${code}</strong>. It expires in 15 minutes.</p>` },
    ],
  };

  try {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SENDGRID_API}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return { ok: false, error: 'network' };
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password, role, organization, location } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    }

    const { salt, hash } = hashPassword(password);
    const user = await createUser({ name, email, passwordHash: hash, salt, role, organization, location });
    if (!user) {
      return NextResponse.json({ error: 'failed_to_create_user' }, { status: 500 });
    }

    // Generate verification code and attempt to send it. Do not return a token yet.
    const codeResult = await generateVerificationCodeForUser(email);
    if (!codeResult) {
      // Created user but couldn't generate code (unexpected) — still return created but warn.
      return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, name: user.name }, verificationSent: false }, { status: 201 });
    }

    // Attempt to send via SendGrid if configured, otherwise console log for dev.
    if (SENDGRID_API && FROM_EMAIL) {
      const send = await sendWithSendGrid(email, codeResult.code);
      if (!send.ok) {
        // Log fallback
        // eslint-disable-next-line no-console
        console.warn('SendGrid send failed for', email, send);
        // eslint-disable-next-line no-console
        console.log(`Verification code for ${email}: ${codeResult.code}`);
        return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, name: user.name }, verificationSent: false, note: 'sendgrid_failed_dev_logged' }, { status: 201 });
      }
      return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, name: user.name }, verificationSent: true }, { status: 201 });
    }

    // Dev fallback: log the code to the server console
    // eslint-disable-next-line no-console
    console.log(`Verification code for ${email}: ${codeResult.code}`);
    return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, name: user.name }, verificationSent: true, dev: true }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
