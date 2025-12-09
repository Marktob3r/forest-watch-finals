import { NextResponse } from 'next/server';
import { verifyToken, findUserById, updateUserById, getUserAchievements } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase';
import { ACHIEVEMENTS, findAchievement } from '@/lib/achievements';

export async function GET(req: Request) {
  try {
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload || !payload.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await findUserById(payload.userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Fetch user achievements from the normalized `user_achievements` table
    const rawAchievements = await getUserAchievements(user.id);

    const publicUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      profileImageUrl: user.profileImageUrl || null,
      role: user.role || 'user',
      organization: user.organization || '',
      location: user.location || '',
      joinedDate: user.createdAt || null,
      reportsSubmitted: user.reportsSubmitted ?? 0,
      alertsReceived: user.alertsReceived ?? 0,
      projectsFollowed: user.projectsFollowed ?? 0,
      recommendations: user.recommendations || [],
      notifications: user.notifications || {
        emailAlerts: false,
        criticalOnly: false,
        weeklyReport: false,
        projectUpdates: false,
      },
      achievements: (rawAchievements || []).map((rec: any) => ({
        id: rec.id,
        achievedAt: rec.achievedAt,
        title: rec.title || rec.id,
        description: rec.description || '',
        icon: rec.icon || undefined,
        metadata: rec.metadata || null,
      })),
    };

    // If we have a stored storage path, generate a fresh signed url for client
    try {
      const supabase = getServiceSupabase();
      const path = (user as any).profileImagePath || null;
      if (path) {
        const ttl = 60 * 60 * 24; // 24h
        const { data: signedData, error: signedErr } = await supabase.storage.from('avatars').createSignedUrl(path, ttl);
        if (!signedErr && signedData && (signedData as any).signedUrl) {
          publicUser.profileImageUrl = (signedData as any).signedUrl;
        }
      }
    } catch (e) {
      // ignore signing errors and return whatever we have
    }

    return NextResponse.json({ ok: true, user: publicUser });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload || !payload.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    // For now only allow updating notifications
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Bad request' }, { status: 400 });

    const allowed = {} as any;
    if (body.notifications && typeof body.notifications === 'object') {
      allowed.notifications = {
        emailAlerts: !!body.notifications.emailAlerts,
        criticalOnly: !!body.notifications.criticalOnly,
        weeklyReport: !!body.notifications.weeklyReport,
        projectUpdates: !!body.notifications.projectUpdates,
      };
    }

    if (Object.keys(allowed).length === 0) {
      return NextResponse.json({ error: 'No updatable fields' }, { status: 400 });
    }

    const updated = await updateUserById(payload.userId, allowed);
    if (!updated) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const publicUser = {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role || 'user',
      organization: updated.organization || '',
      location: updated.location || '',
      joinedDate: updated.createdAt || null,
      reportsSubmitted: updated.reportsSubmitted ?? 0,
      alertsReceived: updated.alertsReceived ?? 0,
      projectsFollowed: updated.projectsFollowed ?? 0,
      notifications: updated.notifications || {
        emailAlerts: false,
        criticalOnly: false,
        weeklyReport: false,
        projectUpdates: false,
      },
    };

    return NextResponse.json({ ok: true, user: publicUser });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
