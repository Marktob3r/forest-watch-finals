import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

// GET /api/alerts - return recent alerts from the DB (mapped to camelCase)
export async function GET() {
  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('alerts')
      .select('id, region_id, report_id, alert_type, severity, message, details, status, created_by, created_at, resolved_at')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch alerts', error);
      return NextResponse.json({ error: 'Failed to load alerts' }, { status: 500 });
    }

    const alerts = (data || []).map((r: any) => ({
      id: r.id,
      regionId: r.region_id,
      reportId: r.report_id,
      alertType: r.alert_type,
      severity: r.severity,
      message: r.message,
      details: r.details,
      status: r.status,
      createdBy: r.created_by,
      createdAt: r.created_at,
      resolvedAt: r.resolved_at,
    }));

    return NextResponse.json({ ok: true, alerts });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to handle /api/alerts', err);
    return NextResponse.json({ error: 'Failed to load alerts' }, { status: 500 });
  }
}
