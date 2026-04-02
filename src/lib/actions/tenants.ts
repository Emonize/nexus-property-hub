'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/actions/auth';

export async function getTenants() {
  const profile = await getCurrentUser();
  if (!profile || (profile.role !== 'owner' && profile.role !== 'manager' && profile.role !== 'admin')) {
    return { error: 'Unauthorized Directory Access', data: [] };
  }
  
  const supabase = await createClient();

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
