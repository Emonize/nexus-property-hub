'use server';

import { createClient } from '@/lib/supabase/server';

export async function getTenants() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized', data: [] };

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

  if (error) return { error: error.message, data: [] };
  return { data: data || [] };
}
