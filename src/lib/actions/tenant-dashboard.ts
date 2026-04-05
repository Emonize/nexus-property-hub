/* eslint-disable @typescript-eslint/no-explicit-any */
 
'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/actions/auth';

export interface TenantKPIs {
  nextPayment: {
    amount: number;
    dueDate: string;
    spaceName: string;
    status: string;
    paymentId: string | null;
  } | null;
  activeRequests: number;
  lease: {
    id: string;
    status: string;
    spaceName: string;
    monthlyRent: number;
    endDate: string | null;
    autoRenew: boolean;
  } | null;
  trustScore: number | null;
}

export interface TenantActionItem {
  id: string;
  type: 'payment' | 'maintenance' | 'lease';
  title: string;
  subtitle: string;
  timestamp: string;
  severity?: string;
  cta: string;
  amount?: number;
}

export async function getTenantDashboardData(): Promise<{
  kpis: TenantKPIs;
  actions: TenantActionItem[];
  recentPayments: Array<{ amount: number; dueDate: string; status: string; spaceName: string }>;
}> {
  const supabase = await createClient();
  const profile = await getCurrentUser();

  const empty: TenantKPIs = {
    nextPayment: null,
    activeRequests: 0,
    lease: null,
    trustScore: null,
  };

  if (!profile || profile.role !== 'tenant') {
    return { kpis: empty, actions: [], recentPayments: [] };
  }

  const tenantId = profile.id;

  // Run all queries in parallel
  const [paymentsResult, ticketsResult, leaseResult, trustResult, recentPaymentsResult] = await Promise.all([
    // Next upcoming or overdue payment
    supabase
      .from('rent_payments')
      .select('id, amount, due_date, status, lease:leases(space:spaces(name))')
      .eq('tenant_id', tenantId)
      .in('status', ['pending', 'failed', 'processing'])
      .order('due_date', { ascending: true })
      .limit(1),

    // Active maintenance tickets
    supabase
      .from('maintenance_tickets')
      .select('id, title, status, ai_severity, created_at, space:spaces(name)')
      .eq('reporter_id', tenantId)
      .in('status', ['open', 'triaged', 'in_progress', 'vendor_assigned'])
      .order('priority', { ascending: true }),

    // Active lease
    supabase
      .from('leases')
      .select('id, status, monthly_rent, end_date, auto_renew, split_pct, space:spaces(name)')
      .eq('tenant_id', tenantId)
      .in('status', ['active', 'pending'])
      .order('created_at', { ascending: false })
      .limit(1),

    // Trust score
    supabase
      .from('trust_scores')
      .select('score')
      .eq('user_id', tenantId)
      .single(),

    // Recent payment history (last 6)
    supabase
      .from('rent_payments')
      .select('amount, due_date, status, lease:leases(space:spaces(name))')
      .eq('tenant_id', tenantId)
      .order('due_date', { ascending: false })
      .limit(6),
  ]);

  // Build KPIs
  const nextPaymentRow = paymentsResult.data?.[0] as any;
  const leaseRow = leaseResult.data?.[0] as any;

  const kpis: TenantKPIs = {
    nextPayment: nextPaymentRow ? {
      amount: Number(nextPaymentRow.amount),
      dueDate: nextPaymentRow.due_date,
      spaceName: nextPaymentRow.lease?.space?.name || 'Unknown',
      status: nextPaymentRow.status,
      paymentId: nextPaymentRow.id,
    } : null,
    activeRequests: ticketsResult.data?.length ?? 0,
    lease: leaseRow ? {
      id: leaseRow.id,
      status: leaseRow.status,
      spaceName: leaseRow.space?.name || 'Unknown',
      monthlyRent: Number(leaseRow.monthly_rent) * Number(leaseRow.split_pct || 100) / 100,
      endDate: leaseRow.end_date,
      autoRenew: leaseRow.auto_renew,
    } : null,
    trustScore: trustResult.data?.score ?? null,
  };

  // Build action items
  const actions: TenantActionItem[] = [];

  // Overdue / failed payments become action items
  if (nextPaymentRow && (nextPaymentRow.status === 'failed' || isOverdue(nextPaymentRow.due_date))) {
    actions.push({
      id: nextPaymentRow.id,
      type: 'payment',
      title: nextPaymentRow.status === 'failed'
        ? `Payment Failed — $${Number(nextPaymentRow.amount)}`
        : `Rent Overdue — $${Number(nextPaymentRow.amount)}`,
      subtitle: nextPaymentRow.lease?.space?.name || 'Unknown space',
      timestamp: nextPaymentRow.due_date,
      severity: 'critical',
      cta: 'Pay Now',
      amount: Number(nextPaymentRow.amount),
    });
  }

  // Open maintenance tickets become action items
  if (ticketsResult.data) {
    for (const ticket of ticketsResult.data) {
      const t = ticket as any;
      actions.push({
        id: t.id,
        type: 'maintenance',
        title: t.title,
        subtitle: `${t.space?.name || 'Unknown space'} · ${t.status.replace('_', ' ')}`,
        timestamp: t.created_at,
        severity: t.ai_severity === 'critical' ? 'critical' : t.ai_severity === 'high' ? 'high' : undefined,
        cta: 'View',
      });
    }
  }

  // Pending leases needing action
  if (leaseRow && leaseRow.status === 'pending') {
    actions.push({
      id: leaseRow.id,
      type: 'lease',
      title: 'Lease Pending Signature',
      subtitle: leaseRow.space?.name || 'Unknown space',
      timestamp: new Date().toISOString(),
      cta: 'Review',
    });
  }

  // Recent payments history
  const recentPayments = (recentPaymentsResult.data ?? []).map((p: any) => ({
    amount: Number(p.amount),
    dueDate: p.due_date,
    status: p.status,
    spaceName: p.lease?.space?.name || 'Unknown',
  }));

  return { kpis, actions, recentPayments };
}

function isOverdue(dueDate: string): boolean {
  return new Date(dueDate) < new Date(new Date().toISOString().split('T')[0]);
}
