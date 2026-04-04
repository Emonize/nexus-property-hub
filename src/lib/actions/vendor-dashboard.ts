'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/actions/auth';

export interface VendorKPIs {
  assignedTickets: number;
  inProgress: number;
  completedThisMonth: number;
  avgResolutionHours: number | null;
}

export interface VendorTicket {
  id: string;
  title: string;
  description: string | null;
  spaceName: string;
  severity: string | null;
  category: string | null;
  priority: number;
  status: string;
  costEstimate: number | null;
  createdAt: string;
  reporterName: string;
}

export async function getVendorDashboardData(): Promise<{
  kpis: VendorKPIs;
  assignedTickets: VendorTicket[];
  recentlyCompleted: VendorTicket[];
}> {
  const supabase = await createClient();
  const profile = await getCurrentUser();

  const empty: VendorKPIs = {
    assignedTickets: 0,
    inProgress: 0,
    completedThisMonth: 0,
    avgResolutionHours: null,
  };

  if (!profile || profile.role !== 'vendor') {
    return { kpis: empty, assignedTickets: [], recentlyCompleted: [] };
  }

  const vendorId = profile.id;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // Run all queries in parallel
  const [activeResult, completedResult] = await Promise.all([
    // Active tickets assigned to this vendor
    supabase
      .from('maintenance_tickets')
      .select(`
        id, title, description, priority, status, ai_severity, ai_category,
        ai_cost_estimate, created_at,
        space:spaces(name),
        reporter:users!maintenance_tickets_reporter_id_fkey(full_name)
      `)
      .eq('assigned_to', vendorId)
      .in('status', ['vendor_assigned', 'in_progress', 'triaged'])
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false }),

    // Completed tickets this month
    supabase
      .from('maintenance_tickets')
      .select(`
        id, title, description, priority, status, ai_severity, ai_category,
        ai_cost_estimate, created_at, resolved_at,
        space:spaces(name),
        reporter:users!maintenance_tickets_reporter_id_fkey(full_name)
      `)
      .eq('assigned_to', vendorId)
      .in('status', ['resolved', 'closed'])
      .gte('resolved_at', monthStart)
      .order('resolved_at', { ascending: false })
      .limit(20),
  ]);

  const activeTickets = (activeResult.data ?? []) as any[];
  const completedTickets = (completedResult.data ?? []) as any[];

  // Calculate average resolution time for completed tickets
  let avgResolutionHours: number | null = null;
  if (completedTickets.length > 0) {
    const totalHours = completedTickets.reduce((sum: number, t: any) => {
      if (t.resolved_at && t.created_at) {
        const created = new Date(t.created_at).getTime();
        const resolved = new Date(t.resolved_at).getTime();
        return sum + (resolved - created) / (1000 * 60 * 60);
      }
      return sum;
    }, 0);
    avgResolutionHours = Math.round((totalHours / completedTickets.length) * 10) / 10;
  }

  const mapTicket = (t: any): VendorTicket => ({
    id: t.id,
    title: t.title,
    description: t.description,
    spaceName: t.space?.name || 'Unknown',
    severity: t.ai_severity,
    category: t.ai_category,
    priority: t.priority,
    status: t.status,
    costEstimate: t.ai_cost_estimate ? Number(t.ai_cost_estimate) : null,
    createdAt: t.created_at,
    reporterName: t.reporter?.full_name || 'Unknown',
  });

  const kpis: VendorKPIs = {
    assignedTickets: activeTickets.length,
    inProgress: activeTickets.filter(t => t.status === 'in_progress').length,
    completedThisMonth: completedTickets.length,
    avgResolutionHours,
  };

  return {
    kpis,
    assignedTickets: activeTickets.map(mapTicket),
    recentlyCompleted: completedTickets.slice(0, 5).map(mapTicket),
  };
}
