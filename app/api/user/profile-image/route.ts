import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { verifyToken } from '@/lib/auth';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload || !payload.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = file.type || 'application/octet-stream';
    const rawName = (file as any).name || '';
    let ext = '';
    if (rawName.includes('.')) ext = rawName.split('.').pop() || '';
    if (!ext) {
      // fallback for common types
      if (contentType === 'image/png') ext = 'png';
      else if (contentType === 'image/jpeg') ext = 'jpg';
      else if (contentType === 'image/webp') ext = 'webp';
      else ext = 'bin';
    }

    const userId = String(payload.userId);
    const filename = `${userId}/${crypto.randomUUID()}.${ext}`;

    const supabase = getServiceSupabase();

    // Upload to storage bucket named 'avatars'
    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from('avatars')
      .upload(filename, buffer, { contentType, upsert: false });

    if (uploadErr) {
      // eslint-disable-next-line no-console
      console.error('Supabase storage upload error', uploadErr);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filename);
    const publicUrl = (urlData as any).publicUrl || '';

    // create a signed url for immediate client use (good for private buckets)
    let signedUrl = publicUrl;
    try {
      const ttl = 60 * 60 * 24; // 24 hours
      const { data: signedData, error: signedErr } = await supabase.storage.from('avatars').createSignedUrl(filename, ttl);
      if (!signedErr && signedData && (signedData as any).signedUrl) {
        signedUrl = (signedData as any).signedUrl;
      }
    } catch (e) {
      // ignore signed url failures and fall back to publicUrl
    }

    // update user profile_image_path (store the storage path so we can generate signed urls later)
    const { error: updateErr } = await supabase.from('users').update({ profile_image_path: filename }).eq('id', userId);
    if (updateErr) {
      // eslint-disable-next-line no-console
      console.error('Failed to update user profile image url', updateErr);
      return NextResponse.json({ error: 'Failed to update user record' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, url: signedUrl, path: filename });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload || !payload.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = String(payload.userId);
    const supabase = getServiceSupabase();

    // fetch current profile image path
    const { data: userData, error: userErr } = await supabase.from('users').select('profile_image_path').eq('id', userId).single();
    if (userErr) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch user', userErr);
      return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
    }

    const path = (userData as any)?.profile_image_path;
    if (!path) {
      return NextResponse.json({ ok: true, message: 'No profile image' });
    }

    // remove from storage
    const { error: delErr } = await supabase.storage.from('avatars').remove([path]);
    if (delErr) {
      // eslint-disable-next-line no-console
      console.error('Failed to remove storage object', delErr);
      return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 });
    }

    // clear DB reference
    const { error: updateErr } = await supabase.from('users').update({ profile_image_path: null }).eq('id', userId);
    if (updateErr) {
      // eslint-disable-next-line no-console
      console.error('Failed to clear profile_image_path', updateErr);
      return NextResponse.json({ error: 'Failed to update user record' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
