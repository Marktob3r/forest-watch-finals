import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { verifyToken } from '@/lib/auth';
import crypto from 'crypto';

// GET ?reportId=...
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const reportId = url.searchParams.get('reportId');
    if (!reportId) return NextResponse.json({ ok: true, images: [] });

    const supabase = getServiceSupabase();
    const { data, error } = await supabase.from('report_images').select('*').eq('report_id', reportId).order('uploaded_at', { ascending: true });
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to query report images', error);
      return NextResponse.json({ ok: false, error: 'Failed to load images' }, { status: 500 });
    }

    const images = (data || []).map((r: any) => ({ ...r }));
    // generate signed urls where possible
    const signedPromises = images.map(async (img: any) => {
      try {
        const ttl = 60 * 60 * 24;
        const { data: signed, error: signedErr } = await supabase.storage.from(img.bucket || 'reports').createSignedUrl(img.storage_path, ttl);
        if (!signedErr && signed && (signed as any).signedUrl) return { ...img, signedUrl: (signed as any).signedUrl };
        const { data: pub } = supabase.storage.from(img.bucket || 'reports').getPublicUrl(img.storage_path);
        return { ...img, signedUrl: (pub as any).publicUrl || '' };
      } catch (e) {
        return { ...img, signedUrl: '' };
      }
    });

    const resolved = await Promise.all(signedPromises);
    return NextResponse.json({ ok: true, images: resolved });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 });
  }
}

// POST { reportId, storage_path, filename, content_type, size_bytes, bucket }
export async function POST(req: Request) {
  try {
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload || !payload.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const contentType = req.headers.get('content-type') || '';
    const supabase = getServiceSupabase();

    // If multipart form-data with files, handle uploads
    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      const reportId = String(form.get('reportId') || '');
      const bucket = String(form.get('bucket') || 'reports');
      if (!reportId) return NextResponse.json({ error: 'Missing reportId' }, { status: 400 });

      const files = form.getAll('images') as File[];
      const uploadedRows: any[] = [];
      const signedUrls: string[] = [];

      for (const file of files) {
        if (!(file instanceof File)) continue;
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const content_type = file.type || 'application/octet-stream';
        const rawName = (file as any).name || '';
        let ext = '';
        if (rawName.includes('.')) ext = rawName.split('.').pop() || '';
        if (!ext) {
          if (content_type === 'image/png') ext = 'png';
          else if (content_type === 'image/jpeg') ext = 'jpg';
          else if (content_type === 'image/webp') ext = 'webp';
          else ext = 'bin';
        }

        const filename = `${reportId}/${crypto.randomUUID()}.${ext}`;

        // Upload to storage
        try {
          const { data: uploadData, error: uploadErr } = await supabase.storage.from(bucket).upload(filename, buffer, { contentType: content_type, upsert: false });
          if (uploadErr) {
            // eslint-disable-next-line no-console
            console.error('Upload error for report image', uploadErr);
            continue;
          }

          // insert metadata
          const row = { report_id: reportId, bucket, storage_path: filename, filename: rawName, content_type, size_bytes: buffer.length, uploaded_by: payload.userId, uploaded_at: new Date().toISOString() };
          const { data, error } = await supabase.from('report_images').insert(row).select().single();
          if (error) {
            // eslint-disable-next-line no-console
            console.error('Failed to insert report image', error);
          } else {
            uploadedRows.push(data);
          }

          // file_assets entry
          try {
            await supabase.from('file_assets').insert({ owner_id: payload.userId, bucket, storage_path: filename, filename: rawName, content_type, size_bytes: buffer.length, related_table: 'report_images', related_id: (data as any)?.id || null }).select();
          } catch (e) {}

          // attempt signed url
          try {
            const ttl = 60 * 60 * 24;
            const { data: signedData, error: signedErr } = await supabase.storage.from(bucket).createSignedUrl(filename, ttl);
            if (!signedErr && signedData && (signedData as any).signedUrl) signedUrls.push((signedData as any).signedUrl);
            else {
              const { data: pub } = supabase.storage.from(bucket).getPublicUrl(filename);
              signedUrls.push((pub as any).publicUrl || '');
            }
          } catch (e) { signedUrls.push(''); }

          // update reports.images by fetching existing and appending
          try {
            const { data: rpt, error: rptErr } = await supabase.from('reports').select('images').eq('id', reportId).limit(1).maybeSingle();
            if (!rptErr) {
              const existing = Array.isArray((rpt as any)?.images) ? (rpt as any).images : [];
              const updated = [...existing, filename];
              await supabase.from('reports').update({ images: updated }).eq('id', reportId);
            }
          } catch (e) { }
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error('File upload error', e);
        }
      }

      return NextResponse.json({ ok: true, images: uploadedRows, signedUrls }, { status: 201 });
    }

    // Fallback: JSON body mode (existing behavior)
    const body = await req.json();
    const reportId = String(body?.reportId || '');
    const storage_path = String(body?.storage_path || '');
    const filename = String(body?.filename || '');
    const content_type = String(body?.content_type || '');
    const size_bytes = Number(body?.size_bytes || 0);
    const bucket = String(body?.bucket || 'reports');
    if (!reportId || !storage_path) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const row = { report_id: reportId, bucket, storage_path, filename, content_type, size_bytes: size_bytes || null, uploaded_by: payload.userId, uploaded_at: new Date().toISOString() };
    const { data, error } = await supabase.from('report_images').insert(row).select().single();
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to insert report image', error);
      return NextResponse.json({ error: 'Failed to save image metadata' }, { status: 500 });
    }
    // also insert into file_assets for central tracking
    try {
      await supabase.from('file_assets').insert({ owner_id: payload.userId, bucket, storage_path, filename, content_type, size_bytes: size_bytes || null, related_table: 'report_images', related_id: data.id }).select();
    } catch (e) {
      // non-fatal
    }

    // also append to reports.images
    try {
      const { data: rpt } = await supabase.from('reports').select('images').eq('id', reportId).limit(1).maybeSingle();
      const existing = Array.isArray((rpt as any)?.images) ? (rpt as any).images : [];
      const updated = [...existing, storage_path];
      await supabase.from('reports').update({ images: updated }).eq('id', reportId);
    } catch (e) {}

    return NextResponse.json({ ok: true, image: data }, { status: 201 });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

// DELETE { id } or { storage_path }
export async function DELETE(req: Request) {
  try {
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload || !payload.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const id = body?.id || null;
    const storage_path = body?.storage_path || null;
    if (!id && !storage_path) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const supabase = getServiceSupabase();
    let row: any = null;
    if (id) {
      const { data, error } = await supabase.from('report_images').select('*').eq('id', id).limit(1).maybeSingle();
      if (error) return NextResponse.json({ error: 'Failed to query image' }, { status: 500 });
      row = data;
    } else {
      const { data, error } = await supabase.from('report_images').select('*').eq('storage_path', storage_path).limit(1).maybeSingle();
      if (error) return NextResponse.json({ error: 'Failed to query image' }, { status: 500 });
      row = data;
    }
    if (!row) return NextResponse.json({ ok: true });

    // Permission: allow uploader or project owner/admin (simple check: uploader only)
    if (row.uploaded_by && row.uploaded_by !== payload.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // attempt delete from storage
    try {
      await supabase.storage.from(row.bucket || 'reports').remove([row.storage_path]);
    } catch (e) {
      // non-fatal
    }

    // delete metadata rows
    try {
      await supabase.from('report_images').delete().eq('id', row.id).limit(1).select();
      await supabase.from('file_assets').delete().eq('storage_path', row.storage_path).limit(1).select();
    } catch (e) {
      // non-fatal
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
