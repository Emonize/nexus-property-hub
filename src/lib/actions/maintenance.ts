'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { MaintenanceTicket, TicketSeverity, TicketStatus } from '@/types/database';

export async function createMaintenanceTicket(formData: {
  space_id: string;
  title: string;
  description?: string;
  photo_urls?: string[];
  voice_note_url?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  // AI Triage — call the triage API route
  let triageResult = null;
  try {
    const triageResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ai/triage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: `${formData.title}. ${formData.description || ''}`,
        photo_urls: formData.photo_urls,
      }),
    });
    if (triageResponse.ok) {
      triageResult = await triageResponse.json();
    }
  } catch {
    // Graceful fallback — create ticket without AI triage
  }

  const { data, error } = await supabase
    .from('maintenance_tickets')
    .insert({
      space_id: formData.space_id,
      reporter_id: user.id,
      title: formData.title,
      description: formData.description || null,
      photo_urls: formData.photo_urls || [],
      voice_note_url: formData.voice_note_url || null,
      ai_severity: triageResult?.severity || null,
      ai_category: triageResult?.category || null,
      ai_diy_suggestion: triageResult?.diy_instructions || null,
      ai_cost_estimate: triageResult?.estimated_cost_usd || null,
      priority: triageResult ? severityToPriority(triageResult.severity) : 3,
      status: triageResult?.severity === 'critical' ? 'triaged' : 'open',
    })
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath('/dashboard');
  revalidatePath('/maintenance');
  return { data: data as MaintenanceTicket };
}

function severityToPriority(severity: TicketSeverity): number {
  const map: Record<TicketSeverity, number> = {
    critical: 1,
    high: 2,
    medium: 3,
    low: 4,
    cosmetic: 5,
  };
  return map[severity] || 3;
}

export async function updateTicketStatus(ticketId: string, status: TicketStatus, assignedTo?: string) {
  const supabase = await createClient();
  const updates: Record<string, unknown> = { status };
  if (assignedTo) updates.assigned_to = assignedTo;
  if (status === 'resolved' || status === 'closed') updates.resolved_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('maintenance_tickets')
    .update(updates)
    .eq('id', ticketId)
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath('/dashboard');
  revalidatePath('/maintenance');
  return { data: data as MaintenanceTicket };
}

export async function getMaintenanceTickets(filters?: { status?: TicketStatus; severity?: TicketSeverity; spaceId?: string }) {
  const supabase = await createClient();

  let query = supabase
    .from('maintenance_tickets')
    .select(`*, space:spaces(name, type), reporter:users!maintenance_tickets_reporter_id_fkey(full_name)`)
    .order('priority', { ascending: true })
    .order('created_at', { ascending: false });

  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.severity) query = query.eq('ai_severity', filters.severity);
  if (filters?.spaceId) query = query.eq('space_id', filters.spaceId);

  const { data, error } = await query;
  if (error) return { error: error.message, data: [] };
  return { data };
}

export async function getActionQueueItems() {
  const supabase = await createClient();

  // Combine maintenance tickets, pending payments, and lease actions
  const [tickets, payments, leases] = await Promise.all([
    supabase
      .from('maintenance_tickets')
      .select(`*, space:spaces(name)`)
      .in('status', ['open', 'triaged'])
      .order('priority', { ascending: true })
      .limit(10),
    supabase
      .from('rent_payments')
      .select(`*, lease:leases(space:spaces(name)), tenant:users!rent_payments_tenant_id_fkey(full_name)`)
      .in('status', ['pending', 'failed'])
      .order('due_date', { ascending: true })
      .limit(10),
    supabase
      .from('leases')
      .select(`*, space:spaces(name), tenant:users!leases_tenant_id_fkey(full_name)`)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  return {
    tickets: tickets.data || [],
    payments: payments.data || [],
    leases: leases.data || [],
  };
}
