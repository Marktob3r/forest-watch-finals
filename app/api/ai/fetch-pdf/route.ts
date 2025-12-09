import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const url = String(body?.url || '');
    if (!url) return NextResponse.json({ ok: false, error: 'Missing url' }, { status: 400 });

    // Basic validation
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch (e) {
      return NextResponse.json({ ok: false, error: 'Invalid url' }, { status: 400 });
    }

    const resp = await fetch(parsed.toString());
    if (!resp.ok) return NextResponse.json({ ok: false, error: 'Failed to fetch target' }, { status: 502 });

    const contentType = resp.headers.get('content-type') || 'application/octet-stream';
    const dispositionName = parsed.pathname.split('/').pop() || 'file';
    const filename = dispositionName.includes('.') ? dispositionName : `${dispositionName}.pdf`;

    const arrayBuffer = await resp.arrayBuffer();
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 });
  }
}
