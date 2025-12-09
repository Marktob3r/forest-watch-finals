import { NextResponse } from 'next/server';
import { findUserByEmail, generateVerificationCodeForUser } from '@/lib/auth';

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

    return { ok: res.ok, status: res.status, statusText: res.statusText };
  } catch (err) {
    return { ok: false, error: 'network_error' };
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = body;
    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });

    const user = await findUserByEmail(email);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const result = await generateVerificationCodeForUser(email);
    if (!result) return NextResponse.json({ error: 'Could not generate code' }, { status: 500 });

    // If SendGrid is configured, attempt to send the email. Otherwise fall back to console log.
    if (SENDGRID_API && FROM_EMAIL) {
      const sendResult = await sendWithSendGrid(email, result.code);
      if (!sendResult.ok) {
        // Log the code anyway for developer convenience and return partial success
        // eslint-disable-next-line no-console
        console.warn(`SendGrid send failed for ${email}:`, sendResult);
        // eslint-disable-next-line no-console
        console.log(`Verification code for ${email}: ${result.code}`);
        return NextResponse.json({ ok: true, sent: false, note: 'sendgrid_failed_dev_logged' }, { status: 200 });
      }
      return NextResponse.json({ ok: true, sent: true }, { status: 200 });
    }

    // Dev fallback: log the code to the server console so developers can copy it.
    // eslint-disable-next-line no-console
    console.log(`Verification code for ${email}: ${result.code}`);
    return NextResponse.json({ ok: true, sent: true, dev: true }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
