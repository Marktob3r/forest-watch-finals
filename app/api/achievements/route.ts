import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase.from('achievements').select('*').order('created_at', { ascending: true });
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to query achievements', error);
      return NextResponse.json({ error: 'Failed to load achievements' }, { status: 500 });
    }
    return NextResponse.json({ ok: true, achievements: data || [] });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return NextResponse.json({ error: 'Failed to load achievements' }, { status: 500 });
  }
}
