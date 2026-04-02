import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized', data: [] }, { status: 401 });

    // Get tenants: users with active leases on any of the current user's spaces
    const { data, error } = await supabase
      .from('users')
      .select(`
        id, full_name, email, phone, role,
        leases:leases!leases_tenant_id_fkey(
          id, space_id, status,
          space:spaces(name)
        ),
        trust:trust_scores(score)
      `)
      .eq('role', 'tenant');

    if (error) return NextResponse.json({ error: error.message, data: [] }, { status: 500 });
    return NextResponse.json({ data: data || [] });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch tenants', data: [] }, { status: 500 });
  }
}
