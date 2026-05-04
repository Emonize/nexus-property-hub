'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/actions/auth';
import type { Lease, LeaseType, LeaseStatus } from '@/types/database';
import { v4 as uuidv4 } from 'uuid';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function createLease(formData: {
  space_id: string;
  tenant_id: string; // can be email or uuid
  lease_type?: LeaseType;
  start_date: string;
  end_date?: string;
  monthly_rent: number;
  deposit?: number;
  payment_day?: number;
  split_pct?: number;
  auto_renew?: boolean;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  // Use service role key to bypass RLS for auth admin actions and user lookups
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let resolvedTenantId = formData.tenant_id;
  
  if (resolvedTenantId.includes('@')) {
    // Look up existing user by email using Admin client to bypass RLS
    const { data: existingUser } = await supabaseAdmin.from('users').select('id').eq('email', resolvedTenantId).single();
    if (existingUser) {
      resolvedTenantId = existingUser.id;
    } else {
      // Need to invite the user
      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(resolvedTenantId);
      if (inviteError) {
        console.error("Failed to invite tenant:", inviteError);
        return { error: 'Failed to invite tenant. Please ensure the email is valid.' };
      }
      resolvedTenantId = inviteData.user.id;
      
      // Poll until the database trigger creates the public.users record
      let userCreated = false;
      for (let i = 0; i < 20; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        const { data } = await supabaseAdmin.from('users').select('id').eq('id', resolvedTenantId).single();
        if (data) {
          userCreated = true;
          break;
        }
      }
      if (!userCreated) {
        return { error: 'Tenant account creation timed out. Please try again.' };
      }
      
      // Update role to tenant
      await supabaseAdmin.from('users').update({ role: 'tenant' }).eq('id', resolvedTenantId);
    }
  }

  // Check for existing leases on the same space to auto-create split groups
  const { data: existingLeases } = await supabase
    .from('leases')
    .select('*')
    .eq('space_id', formData.space_id)
    .in('status', ['active', 'pending']);

  let split_group_id: string | null = null;
  const split_pct = formData.split_pct ?? 100;

  if (existingLeases && existingLeases.length > 0) {
    // Use existing split group or create one
    split_group_id = existingLeases[0].split_group_id || uuidv4();

    // Calculate total split percentage
    const existingTotal = existingLeases.reduce((sum, l) => sum + Number(l.split_pct), 0);
    if (existingTotal + split_pct > 100.01) {
      return { error: `Split percentages exceed 100%. Current total: ${existingTotal}%, trying to add: ${split_pct}%` };
    }

    // Update existing leases to have the split_group_id if they don't already
    if (!existingLeases[0].split_group_id) {
      for (const lease of existingLeases) {
        await supabase
          .from('leases')
          .update({ split_group_id })
          .eq('id', lease.id);
      }
    }
  }

  const { data, error } = await supabase
    .from('leases')
    .insert({
      id: uuidv4(),
      space_id: formData.space_id,
      tenant_id: resolvedTenantId,
      lease_type: formData.lease_type || 'fixed',
      start_date: formData.start_date,
      end_date: formData.end_date || null,
      monthly_rent: formData.monthly_rent,
      deposit: formData.deposit || 0,
      payment_day: formData.payment_day || 1,
      split_group_id,
      split_pct,
      auto_renew: formData.auto_renew || false,
      status: 'pending' as LeaseStatus,
    })
    .select()
    .single();

  if (error) {
    console.error("Supabase insert error:", error);
    return { error: error.message };
  }

  // Update space status to occupied
  await supabase
    .from('spaces')
    .update({ status: 'occupied' })
    .eq('id', formData.space_id);

  revalidatePath('/dashboard');
  revalidatePath('/leases');
  revalidatePath('/spaces');
  
  return { data: data as Lease };
}

export async function updateLeaseStatus(leaseId: string, status: LeaseStatus) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data, error } = await supabase
    .from('leases')
    .update({ status })
    .eq('id', leaseId)
    .select()
    .single();

  if (error) return { error: error.message };

  // If terminated/expired, check if space should become vacant
  if (status === 'terminated' || status === 'expired') {
    const lease = data as Lease;
    const { data: remainingLeases } = await supabase
      .from('leases')
      .select('id')
      .eq('space_id', lease.space_id)
      .eq('status', 'active');

    if (!remainingLeases || remainingLeases.length === 0) {
      await supabase
        .from('spaces')
        .update({ status: 'vacant' })
        .eq('id', lease.space_id);
    }
  }

  revalidatePath('/dashboard');
  revalidatePath('/leases');
  return { data: data as Lease };
}

export async function getLeases() {
  const supabase = await createClient();
  const profile = await getCurrentUser();
  
  if (profile?.role === 'vendor') {
    return { error: 'Unauthorized UI Climber: Restricting Leases Fetches', data: [] };
  }

  let query = supabase
    .from('leases')
    .select(`*, space:spaces(*), tenant:users!leases_tenant_id_fkey(*)`)
    .order('created_at', { ascending: false });

  if (profile?.role === 'tenant') {
    query = query.eq('tenant_id', profile.id);
  }

  const { data, error } = await query;

  if (error) return { error: error.message, data: [] };
  return { data: data as Lease[] };
}

export async function getLeaseById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('leases')
    .select(`*, space:spaces(*), tenant:users!leases_tenant_id_fkey(*)`)
    .eq('id', id)
    .single();

  if (error) return { error: error.message };
  return { data: data as Lease };
}

export async function getSplitGroupLeases(splitGroupId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('leases')
    .select(`*, tenant:users!leases_tenant_id_fkey(full_name, email)`)
    .eq('split_group_id', splitGroupId);

  if (error) return { error: error.message, data: [] };
  return { data };
}
