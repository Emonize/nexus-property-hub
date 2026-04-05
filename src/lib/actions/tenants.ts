'use server';

import { createClient } from '@/lib/supabase/server';


export async function getTenants() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return { error: 'Unauthorized: Session missing or expired', data: [] };

  const { createServiceClient } = await import('@/lib/supabase/server');
  const supabaseAdmin = await createServiceClient();

  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'owner' && profile.role !== 'manager' && profile.role !== 'admin')) {
    return { error: 'Unauthorized Directory Access', data: [] };
  }

  const { data, error } = await supabaseAdmin
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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return { error: 'Unauthorized: Session missing or expired' };

  // Use admin client to bypass any brittle Postgres RLS policies for auth check
  const { createServiceClient } = await import('@/lib/supabase/server');
  const supabaseAdmin = await createServiceClient();

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError) {
    return { error: `Database Error: ${profileError.message} (Code: ${profileError.code})` };
  }

  if (!profile) {
    return { error: 'Unauthorized: Profile not found in database registry' };
  }
  if (profile.role !== 'owner' && profile.role !== 'manager' && profile.role !== 'admin') {
    return { error: `Unauthorized: Insufficient privileges (Role: ${profile.role})` };
  }


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
