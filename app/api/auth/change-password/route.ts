import { NextResponse } from 'next/server';
import { verifyToken, findUserById, verifyPassword, hashPassword, updateUserById } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload || !payload.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { currentPassword, newPassword } = body || {};
    if (!currentPassword || !newPassword) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const user = await findUserById(payload.userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // verify current password
    if (!user.salt || !user.passwordHash) return NextResponse.json({ error: 'Password not set' }, { status: 400 });
    const ok = verifyPassword(currentPassword, user.salt, user.passwordHash);
    if (!ok) return NextResponse.json({ error: 'Current password incorrect' }, { status: 403 });

    // hash new password and update
    const { salt, hash } = hashPassword(newPassword);
    const updated = await updateUserById(user.id, { passwordHash: hash, salt });
    if (!updated) return NextResponse.json({ error: 'Failed to update' }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
