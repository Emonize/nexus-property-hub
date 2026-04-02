'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { RentPayment, PaymentStatus, DashboardKPIs } from '@/types/database';

export async function createPaymentForLease(leaseId: string, dueDate: string) {
  const supabase = await createClient();

  const { data: lease, error: leaseError } = await supabase
    .from('leases')
    .select('*')
    .eq('id', leaseId)
    .single();

  if (leaseError || !lease) return { error: 'Lease not found' };

  const amount = Number(lease.monthly_rent) * Number(lease.split_pct) / 100;

  const { data, error } = await supabase
    .from('rent_payments')
    .insert({
      lease_id: leaseId,
      tenant_id: lease.tenant_id,
      amount,
      due_date: dueDate,
      status: 'pending' as PaymentStatus,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: data as RentPayment };
}

export async function generateMonthlyPayments() {
  const supabase = await createClient();

  const { data: activeLeases, error } = await supabase
    .from('leases')
    .select('*')
    .eq('status', 'active');

  if (error || !activeLeases) return { error: error?.message || 'No active leases' };

  const now = new Date();
  const dueDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

  const payments = activeLeases.map((lease) => ({
    lease_id: lease.id,
    tenant_id: lease.tenant_id,
    amount: Number(lease.monthly_rent) * Number(lease.split_pct) / 100,
    due_date: dueDate,
    status: 'pending' as PaymentStatus,
  }));

  const { data, error: insertError } = await supabase
    .from('rent_payments')
    .insert(payments)
    .select();

  if (insertError) return { error: insertError.message };
  revalidatePath('/dashboard');
  return { data, count: payments.length };
}

export async function updatePaymentStatus(paymentId: string, status: PaymentStatus, stripePaymentId?: string) {
  const supabase = await createClient();

  const updates: Record<string, unknown> = { status };
  if (status === 'paid') updates.paid_date = new Date().toISOString();
  if (stripePaymentId) updates.stripe_payment_id = stripePaymentId;

  const { data, error } = await supabase
    .from('rent_payments')
    .update(updates)
    .eq('id', paymentId)
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath('/dashboard');
  revalidatePath('/payments');
  return { data: data as RentPayment };
}

export async function applyLateFee(paymentId: string, fee: number) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('rent_payments')
    .update({
      late_fee: fee,
      notes: `Late fee of $${fee} applied on ${new Date().toISOString()}`,
    })
    .eq('id', paymentId)
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath('/payments');
  return { data: data as RentPayment };
}

export async function getPayments(filters?: { status?: PaymentStatus; tenantId?: string; month?: string }) {
  const supabase = await createClient();

  let query = supabase
    .from('rent_payments')
    .select(`*, lease:leases(*, space:spaces(name)), tenant:users!rent_payments_tenant_id_fkey(full_name, email)`)
    .order('due_date', { ascending: false });

  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.tenantId) query = query.eq('tenant_id', filters.tenantId);

  const { data, error } = await query;
  if (error) return { error: error.message, data: [] };
  return { data };
}

export async function getDashboardKPIs(): Promise<{ data?: DashboardKPIs; error?: string }> {
  const supabase = await createClient();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  // Current month payments
  const { data: currentPayments } = await supabase
    .from('rent_payments')
    .select('amount, status')
    .gte('due_date', monthStart)
    .lte('due_date', monthEnd);

  const totalPayments = currentPayments?.length || 0;
  const collectedPayments = currentPayments?.filter(p => p.status === 'paid').length || 0;
  const totalCashFlow = currentPayments
    ?.filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  const collectionRate = totalPayments > 0 ? (collectedPayments / totalPayments) * 100 : 0;

  // 6-month trend
  const cashFlowTrend: number[] = [];
  for (let i = 5; i >= 0; i--) {
    const trendMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const trendStart = trendMonth.toISOString().split('T')[0];
    const trendEnd = new Date(trendMonth.getFullYear(), trendMonth.getMonth() + 1, 0).toISOString().split('T')[0];

    const { data: monthData } = await supabase
      .from('rent_payments')
      .select('amount')
      .eq('status', 'paid')
      .gte('due_date', trendStart)
      .lte('due_date', trendEnd);

    cashFlowTrend.push(monthData?.reduce((sum, p) => sum + Number(p.amount), 0) || 0);
  }

  // Urgent repairs
  const { data: tickets } = await supabase
    .from('maintenance_tickets')
    .select('ai_severity')
    .in('status', ['open', 'triaged', 'in_progress']);

  const urgentRepairs = tickets?.filter(t => t.ai_severity === 'critical' || t.ai_severity === 'high').length || 0;
  const criticalRepairs = tickets?.filter(t => t.ai_severity === 'critical').length || 0;

  return {
    data: {
      totalCashFlow,
      cashFlowTrend,
      collectionRate,
      totalPayments,
      collectedPayments,
      urgentRepairs,
      criticalRepairs,
    }
  };
}
