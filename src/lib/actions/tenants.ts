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

export async function inviteTenant(formData: { email: string; full_name: string; phone?: string }) {
  const profile = await getCurrentUser();
  if (!profile || (profile.role !== 'owner' && profile.role !== 'manager' && profile.role !== 'admin')) {
    return { error: 'Unauthorized Directory Access' };
  }

  // Create a service client to interact with Supabase Auth Admin
  const { createServiceClient } = await import('@/lib/supabase/server');
  const supabaseAdmin = await createServiceClient();

  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(formData.email, {
    data: {
      full_name: formData.full_name,
      role: 'tenant',
      phone: formData.phone || '', // Store metadata during invite
    },
    // Optional: override the redirect URL if needed (falling back to Site URL)
  });

  if (error) return { error: error.message };

  // Wait, Supabase Auth trigger will handle inserting into public.users
  // Just force a revalidate of the tenants page
  const { revalidatePath } = await import('next/cache');
  revalidatePath('/tenants');
  revalidatePath('/dashboard');

  return { success: true, user: data.user };
}
