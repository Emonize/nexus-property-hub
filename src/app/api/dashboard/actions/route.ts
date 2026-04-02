import { NextResponse } from 'next/server';
import { getActionQueueItems } from '@/lib/actions/maintenance';

export async function GET() {
  try {
    const result = await getActionQueueItems();
    
    // Transform into the unified action queue format
    const items = [
      ...(result.tickets || []).map((t: Record<string, unknown>) => ({
        id: t.id as string,
        type: 'maintenance' as const,
        title: t.title as string,
        subtitle: `${(t.space as Record<string, unknown>)?.name || 'Unknown'} · ${t.ai_category || 'General'}`,
        timestamp: t.created_at as string,
        severity: t.ai_severity as string | undefined,
        cta: Number(t.ai_cost_estimate) > 0 ? `Approve Repair $${t.ai_cost_estimate}` : 'Review',
        amount: Number(t.ai_cost_estimate) || undefined,
      })),
      ...(result.payments || []).map((p: Record<string, unknown>) => ({
        id: p.id as string,
        type: 'payment' as const,
        title: `Rent ${p.status === 'failed' ? 'failed' : 'overdue'}`,
        subtitle: `${(p.tenant as Record<string, unknown>)?.full_name || 'Unknown'} · Due ${p.due_date}`,
        timestamp: p.created_at as string || new Date().toISOString(),
        severity: p.status === 'failed' ? 'high' : undefined,
        cta: 'Send Reminder',
        amount: Number(p.amount) || undefined,
      })),
      ...(result.leases || []).map((l: Record<string, unknown>) => ({
        id: l.id as string,
        type: 'lease' as const,
        title: 'New application received',
        subtitle: `${(l.space as Record<string, unknown>)?.name || 'Unknown'} · ${(l.tenant as Record<string, unknown>)?.full_name || 'Unknown'}`,
        timestamp: l.created_at as string,
        severity: undefined,
        cta: 'Review',
        amount: undefined,
      })),
    ];

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] }, { status: 500 });
  }
}
