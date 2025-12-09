import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { verifyToken, awardAchievementToUser } from '@/lib/auth';
import crypto from 'crypto';

export async function GET(req: Request) {
  try {
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
    if (!token) return NextResponse.json({ ok: true, reports: [] }, { status: 200 });
    const payload = verifyToken(token);
    if (!payload || !payload.userId) return NextResponse.json({ ok: true, reports: [] }, { status: 200 });

    const supabase = getServiceSupabase();
    const userId = String(payload.userId);
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to query reports for user', error);
      return NextResponse.json({ ok: false, error: 'Failed to load reports' }, { status: 500 });
    }

    // For each report, generate signed urls for images (if any)
    const reportsWithUrls: any[] = [];
    for (const r of (data || [])) {
      const images: string[] = Array.isArray(r.images) ? r.images : [];
      const imageUrls: string[] = [];
      for (const imgPath of images) {
        try {
          const ttl = 60 * 60 * 24; // 24 hours
          const { data: signedData, error: signedErr } = await supabase.storage.from('reports').createSignedUrl(imgPath, ttl);
          if (!signedErr && signedData && (signedData as any).signedUrl) {
            imageUrls.push((signedData as any).signedUrl);
          } else {
            const { data: publicData } = supabase.storage.from('reports').getPublicUrl(imgPath);
            imageUrls.push((publicData as any).publicUrl || '');
          }
        } catch (e) {
          try {
            const { data: publicData } = supabase.storage.from('reports').getPublicUrl(imgPath);
            imageUrls.push((publicData as any).publicUrl || '');
          } catch (e2) {
            imageUrls.push('');
          }
        }
      }
      reportsWithUrls.push({ ...r, imageUrls });
    }

    return NextResponse.json({ ok: true, reports: reportsWithUrls }, { status: 200 });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
    let userId: string | null = null;
    if (token) {
      const payload = verifyToken(token);
      if (payload && payload.userId) userId = String(payload.userId);
    }
    const contentType = req.headers.get('content-type') || '';

    let type = '';
    let location = '';
    let description = '';
    let severity: string | null = null;
    let latitude: number | null = null;
    let longitude: number | null = null;
    let files: File[] = [];

    if (contentType.includes('application/json')) {
      const body = await req.json();
      type = String(body?.type || '').trim();
      location = String(body?.location || '').trim();
      description = String(body?.description || '').trim();
      severity = body?.severity ? String(body.severity).trim() : null;
      latitude = body?.latitude ? Number(body.latitude) : null;
      longitude = body?.longitude ? Number(body.longitude) : null;
    } else {
      const form = await req.formData();
      type = String(form.get('type') || '').trim();
      location = String(form.get('location') || '').trim();
      description = String(form.get('description') || '').trim();
      severity = String(form.get('severity') || '').trim() || null;
      const latitudeRaw = form.get('latitude');
      const longitudeRaw = form.get('longitude');
      latitude = latitudeRaw ? Number(String(latitudeRaw)) : null;
      longitude = longitudeRaw ? Number(String(longitudeRaw)) : null;
      files = form.getAll('images') as File[];
    }

    if (!type || !location || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const reportId = crypto.randomUUID();
    const now = new Date().toISOString();

    const row = {
      id: reportId,
      user_id: userId,
      type,
      location,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      description,
      severity,
      images: [],
      // Auto-verify all reports for this school project
      status: 'verified',
      created_at: now,
    };

    const { data: inserted, error: insertErr } = await supabase.from('reports').insert(row).select().single();
    if (insertErr) {
      // eslint-disable-next-line no-console
      console.error('Failed to insert report', insertErr);
      return NextResponse.json({ error: 'Failed to create report' }, { status: 500 });
    }

    // If user is authenticated, increment their reports_submitted and possibly award 'first_report'
    if (userId) {
      try {
        const { data: userRow, error: fetchUserErr } = await supabase.from('users').select('reports_submitted').eq('id', userId).limit(1).maybeSingle();
        if (!fetchUserErr && userRow) {
          const prev = Number(userRow.reports_submitted || 0);
          const next = prev + 1;
          const { data: updatedUser, error: updateUserErr } = await supabase.from('users').update({ reports_submitted: next }).eq('id', userId).select().single();
          if (updateUserErr) {
            // eslint-disable-next-line no-console
            console.error('Failed to increment reports_submitted', updateUserErr);
          } else {
            // if this is the user's first report, award achievement 'first_report'
            if (prev === 0) {
              try {
                await awardAchievementToUser(userId, 'first_report');
              } catch (e) {
                // ignore award failures
              }
            }
          }
        }
      } catch (e) {
        // ignore
      }
    }

    // Handle image uploads (multiple files named 'images') — only applicable for form-data mode
    const uploadedPaths: string[] = [];
    const signedUrls: string[] = [];

    if (files && files.length > 0) {
      for (const file of files) {
        if (!(file instanceof File)) continue;
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const contentType = file.type || 'application/octet-stream';
        const rawName = (file as any).name || '';
        let ext = '';
        if (rawName.includes('.')) ext = rawName.split('.').pop() || '';
        if (!ext) {
          if (contentType === 'image/png') ext = 'png';
          else if (contentType === 'image/jpeg') ext = 'jpg';
          else if (contentType === 'image/webp') ext = 'webp';
          else ext = 'bin';
        }

        const filename = `${reportId}/${crypto.randomUUID()}.${ext}`;

        // Upload to 'reports' bucket (ensure this bucket exists in Supabase storage)
        const { data: uploadData, error: uploadErr } = await supabase.storage.from('reports').upload(filename, buffer, { contentType, upsert: false });
        if (uploadErr) {
          // eslint-disable-next-line no-console
          console.error('Upload error for report image', uploadErr);
          continue;
        }
        uploadedPaths.push(filename);

        // attempt to create a signed url for client consumption
        try {
          const ttl = 60 * 60 * 24; // 24 hours
          const { data: signedData, error: signedErr } = await supabase.storage.from('reports').createSignedUrl(filename, ttl);
          if (!signedErr && signedData && (signedData as any).signedUrl) {
            signedUrls.push((signedData as any).signedUrl);
          } else {
            const { data: publicData } = supabase.storage.from('reports').getPublicUrl(filename);
            signedUrls.push((publicData as any).publicUrl || '');
          }
        } catch (e) {
          const { data: publicData } = supabase.storage.from('reports').getPublicUrl(filename);
          signedUrls.push((publicData as any).publicUrl || '');
        }
      }

      if (uploadedPaths.length > 0) {
        const { data: updated, error: updateErr } = await supabase.from('reports').update({ images: uploadedPaths }).eq('id', reportId).select().single();
        if (updateErr) {
          // eslint-disable-next-line no-console
          console.error('Failed to update report images', updateErr);
        }
      }
    }

    // After successful create, return report and signed image urls
    return NextResponse.json({ ok: true, report: inserted, images: signedUrls, paths: uploadedPaths });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
