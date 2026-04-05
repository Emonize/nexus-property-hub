/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';
import EmptyState from '@/components/ui/EmptyState';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Wrench, Plus, Camera, Mic } from 'lucide-react';
import { Virtuoso } from 'react-virtuoso';
import { createClient } from '@/lib/supabase/client';

interface TicketRow {
  id: string;
  title: string;
  space: string;
  reporter: string;
  severity: string;
  category: string;
  cost_estimate: number;
  status: string;
  created_at: string;
  diy_suggestion: string | null;
}

const severityColors: Record<string, string> = {
  critical: 'badge-critical',
  high: 'badge-warning',
  medium: 'badge-info',
  low: 'badge-neutral',
  cosmetic: 'badge-neutral',
};

export default function MaintenancePage() {
  const [showCreate, setShowCreate] = useState(false);
  const [tickets, setTickets] = useState<TicketRow[]>([]);

  const fetchTickets = useCallback(async () => {
    try {
      const { getMaintenanceTickets } = await import('@/lib/actions/maintenance');
      const data = await getMaintenanceTickets();
      if (data && !data.error && data.data) {
        const mapped: TicketRow[] = (data.data as Record<string, unknown>[]).map((t) => ({
            id: t.id as string,
            title: t.title as string,
            space: ((t.space as Record<string, unknown>)?.name as string) || 'Unknown',
            reporter: ((t.reporter as Record<string, unknown>)?.full_name as string) || 'Unknown',
            severity: (t.ai_severity as string) || 'medium',
            category: (t.ai_category as string) || 'general',
            cost_estimate: Number(t.ai_cost_estimate) || 0,
            status: t.status as string,
            created_at: t.created_at as string,
            diy_suggestion: t.ai_diy_suggestion as string | null,
          }));
          setTickets(mapped);
      }
    } catch {
      setTickets([]);
    }
  }, []);

  useEffect(() => {
    fetchTickets();

    const supabase = createClient();
    const channel = supabase
      .channel('maintenance_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'maintenance_tickets' },
        () => {
          // Re-fetch to seamlessly handle foreign key relations (spaces, reporter names)
          fetchTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTickets]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Maintenance</h1>
          <p className="page-subtitle">
            AI-triaged maintenance requests
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(!showCreate)}>
          <Plus size={16} /> New Ticket
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="glass-card fade-in" style={{ padding: 28, marginBottom: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>File Maintenance Request</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="nexus-label">Space</label>
              <select className="nexus-select"><option>Select a space...</option><option>Bedroom 1</option><option>Bedroom 2</option><option>Unit 2B</option></select>
            </div>
            <div>
              <label className="nexus-label">Title</label>
              <input className="nexus-input" placeholder="Brief description" />
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <label className="nexus-label">Description</label>
            <textarea className="nexus-input" rows={3} placeholder="Describe the issue in detail..." style={{ resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button className="btn-secondary"><Camera size={14} /> Add Photo</button>
            <button className="btn-secondary"><Mic size={14} /> Voice Note</button>
            <div style={{ flex: 1 }} />
            <button className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            <button className="btn-primary">Submit &amp; Auto-Triage</button>
          </div>
        </div>
      )}

      {/* Tickets */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {tickets.length > 0 && (
          <Virtuoso
            useWindowScroll
            data={tickets}
            itemContent={(i, ticket) => (
              <div key={ticket.id} className="nexus-card slide-up nexus-list-row" style={{ animationDelay: `${i * 50}ms`, marginBottom: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: ticket.severity === 'critical' || ticket.severity === 'high' ? 'rgba(251, 188, 4, 0.12)' : 'rgba(66, 133, 244, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Wrench size={20} style={{ color: ticket.severity === 'high' ? 'var(--nexus-warning)' : 'var(--nexus-info)' }} aria-label="Wrench Icon" />
                </div>

                <div className="nexus-list-content">
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{ticket.title}</span>
                    <span className={`badge ${severityColors[ticket.severity]}`}>{ticket.severity}</span>
                    {ticket.category !== ticket.severity && (
                      <span className="badge badge-neutral">{ticket.category}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--nexus-text-secondary)', marginTop: 4 }}>
                    {ticket.space} · Reported by {ticket.reporter}
                  </div>

                  {ticket.diy_suggestion && (
                    <div style={{ marginTop: 12, padding: '12px 16px', background: 'rgba(0, 212, 170, 0.06)', border: '1px solid rgba(0, 212, 170, 0.15)', borderRadius: 'var(--nexus-radius-sm)' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--nexus-accent)', marginBottom: 4 }}>💡 AI DIY Suggestion</div>
                      <div style={{ fontSize: 13, color: 'var(--nexus-text-secondary)' }}>{ticket.diy_suggestion}</div>
                    </div>
                  )}
                </div>

                <div className="nexus-list-actions" style={{ flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
                  {ticket.cost_estimate > 0 && (
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--nexus-warning)' }}>
                      ${ticket.cost_estimate}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button className="btn-primary" style={{ padding: '6px 14px', fontSize: 12 }} aria-label={ticket.cost_estimate > 0 ? 'Approve Repair' : 'Close Ticket'}>
                      {ticket.cost_estimate > 0 ? 'Approve' : 'Close'}
                    </button>
                    <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: 12 }} aria-label="Assign to vendor">Assign</button>
                  </div>
                </div>
              </div>
            )}
          />
        )}
        {tickets.length === 0 && (
          <EmptyState
            icon={Wrench}
            title="Zero Maintenance Requests"
            description="Your properties are perfectly maintained. No active service tickets rest in your queue."
          />
        )}
      </div>
    </div>
  );
}
