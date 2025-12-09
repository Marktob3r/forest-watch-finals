import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { verifyToken } from '@/lib/auth';

// GET ?projectId=...
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const projectId = url.searchParams.get('projectId');
    if (!projectId) return NextResponse.json({ ok: true, members: [] });

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('project_members')
      .select('id, project_id, user_id, role, joined_at, users (id, name, email, profile_image_url)')
      .eq('project_id', projectId)
      .order('joined_at', { ascending: true });
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load project members', error);
      return NextResponse.json({ ok: false, error: 'Failed to load members' }, { status: 500 });
    }
    return NextResponse.json({ ok: true, members: data || [] });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 });
  }
}

// POST to add member: { projectId, userId, role }
export async function POST(req: Request) {
  try {
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload || !payload.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const projectId = String(body?.projectId || '');
    const userId = String(body?.userId || payload.userId);
    const role = String(body?.role || 'member');
    if (!projectId || !userId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const supabase = getServiceSupabase();

    // Basic permission: allow adding self; to add others you must already be a project member with role owner/admin
    if (userId !== payload.userId) {
      const { data: myRow } = await supabase.from('project_members').select('role').eq('project_id', projectId).eq('user_id', payload.userId).limit(1).maybeSingle();
      const myRole = myRow?.role || '';
      if (!['owner', 'admin'].includes(myRole)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const insert = { project_id: projectId, user_id: userId, role, joined_at: new Date().toISOString() };
    const { data, error } = await supabase.from('project_members').insert(insert).select().single();
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to add project member', error);
      return NextResponse.json({ error: 'Failed to add member' }, { status: 500 });
    }
    return NextResponse.json({ ok: true, member: data }, { status: 201 });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

// DELETE body { projectId, userId }
export async function DELETE(req: Request) {
  try {
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload || !payload.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const projectId = String(body?.projectId || '');
    const userId = String(body?.userId || '');
    if (!projectId || !userId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const supabase = getServiceSupabase();

    // Permission: allow removing self; to remove others you must be owner/admin
    if (userId !== payload.userId) {
      const { data: myRow } = await supabase.from('project_members').select('role').eq('project_id', projectId).eq('user_id', payload.userId).limit(1).maybeSingle();
      const myRole = myRow?.role || '';
      if (!['owner', 'admin'].includes(myRole)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const { data, error } = await supabase.from('project_members').delete().eq('project_id', projectId).eq('user_id', userId).select().single();
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to remove project member', error);
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
