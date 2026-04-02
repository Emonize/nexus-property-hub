import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('trust_scores')
      .select(`*, user:users!trust_scores_user_id_fkey(full_name, email)`)
      .order('score', { ascending: false });

    if (error) return NextResponse.json({ error: error.message, data: [] }, { status: 500 });
    return NextResponse.json({ data: data || [] });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch trust scores', data: [] }, { status: 500 });
  }
}
