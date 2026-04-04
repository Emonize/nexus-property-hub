/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Wrench, CheckCircle, Clock, AlertTriangle,
  MapPin, ChevronRight, Timer, Hammer,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { useRealtimeTable } from '@/lib/hooks/useRealtimeTable';
import type { VendorKPIs, VendorTicket } from '@/lib/actions/vendor-dashboard';
import { getVendorDashboardData } from '@/lib/actions/vendor-dashboard';
import { updateTicketStatus } from '@/lib/actions/maintenance';

const severityConfig: Record<string, { color: string; badge: string }> = {
  critical: { color: 'var(--nexus-critical)', badge: 'badge-critical' },
  high: { color: 'var(--nexus-warning)', badge: 'badge-warning' },
  medium: { color: 'var(--nexus-info)', badge: 'badge-info' },
  low: { color: 'var(--nexus-text-secondary)', badge: 'badge-neutral' },
  cosmetic: { color: 'var(--nexus-text-muted)', badge: 'badge-neutral' },
};

export default function VendorDashboard() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<VendorKPIs>({
    assignedTickets: 0,
    inProgress: 0,
    completedThisMonth: 0,
    avgResolutionHours: null,
  });
  const [tickets, setTickets] = useState<VendorTicket[]>([]);
  const [completed, setCompleted] = useState<VendorTicket[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const data = await getVendorDashboardData();
      setKpis(data.kpis);
      setTickets(data.assignedTickets);
      setCompleted(data.recentlyCompleted);
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, [fetchData]);

  // Real-time: refresh when tickets change
  useRealtimeTable('maintenance_tickets', fetchData);

  const handleUpdateStatus = async (ticketId: string, newStatus: string) => {
    try {
      await updateTicketStatus(ticketId, newStatus as any);
      fetchData();
    } catch {
      // Error handled silently
    }
  };

  if (!mounted) return null;

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 32 }}>
        <div>
          <h1 className="page-title">Work Orders</h1>
          <p className="page-subtitle">Your assigned maintenance tickets and job status</p>
        </div>
        <button
          className="btn-secondary"
          style={{ fontSize: 13 }}
          onClick={() => router.push('/maintenance')}
        >
          View All Tickets
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid-3" style={{ marginBottom: 24 }}>
        <div className="kpi-card" onClick={() => router.push('/maintenance')} style={{ cursor: 'pointer' }}>
          <div className="kpi-label">
            <Wrench size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Assigned Tickets
          </div>
          <div className="kpi-value" style={{
            color: kpis.assignedTickets > 0 ? 'var(--nexus-warning)' : 'var(--nexus-text-muted)',
          }}>
            {kpis.assignedTickets}
          </div>
          <div style={{ fontSize: 13, color: 'var(--nexus-text-secondary)', marginTop: 8 }}>
            {kpis.assignedTickets === 0 ? 'No active dispatch' : `${kpis.assignedTickets} awaiting action`}
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">
            <Hammer size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            In Progress
          </div>
          <div className="kpi-value" style={{
            color: kpis.inProgress > 0 ? 'var(--nexus-primary-light)' : 'var(--nexus-text-muted)',
          }}>
            {kpis.inProgress}
          </div>
          <div style={{ fontSize: 13, color: 'var(--nexus-text-secondary)', marginTop: 8 }}>
            {kpis.inProgress === 0 ? 'No jobs on-site' : `${kpis.inProgress} job${kpis.inProgress > 1 ? 's' : ''} active`}
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">
            <CheckCircle size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Completed This Month
          </div>
          <div className="kpi-value" style={{
            color: kpis.completedThisMonth > 0 ? 'var(--nexus-positive)' : 'var(--nexus-text-muted)',
          }}>
            {kpis.completedThisMonth}
          </div>
          <div style={{ fontSize: 13, color: 'var(--nexus-text-secondary)', marginTop: 8 }}>
            {kpis.avgResolutionHours !== null
              ? `Avg resolution: ${kpis.avgResolutionHours}h`
              : 'No completions yet'}
          </div>
        </div>
      </div>

      {/* Active Work Orders */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Active Work Orders</h2>

        {tickets.length === 0 ? (
          <div className="nexus-card" style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔧</div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>No active work orders</div>
            <div style={{ color: 'var(--nexus-text-muted)', fontSize: 14, marginTop: 4 }}>
              You&apos;ll be notified when new tickets are assigned to you
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tickets.map((ticket, i) => {
              const sev = severityConfig[ticket.severity || 'medium'] || severityConfig.medium;
              return (
                <div
                  key={ticket.id}
                  className="nexus-card slide-up"
                  style={{ animationDelay: `${i * 50}ms`, padding: 20 }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                    {/* Priority indicator */}
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: ticket.priority <= 2
                        ? 'rgba(234, 67, 53, 0.15)'
                        : 'rgba(66, 133, 244, 0.1)',
                    }}>
                      {ticket.priority <= 2
                        ? <AlertTriangle size={20} style={{ color: 'var(--nexus-critical)' }} />
                        : <Wrench size={20} style={{ color: 'var(--nexus-info)' }} />}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: 15 }}>{ticket.title}</span>
                        {ticket.severity && (
                          <span className={`badge ${sev.badge}`}>{ticket.severity}</span>
                        )}
                        {ticket.category && (
                          <span className="badge badge-neutral">{ticket.category}</span>
                        )}
                      </div>

                      {ticket.description && (
                        <div style={{
                          fontSize: 13, color: 'var(--nexus-text-secondary)',
                          marginTop: 6, lineHeight: 1.5,
                          overflow: 'hidden', textOverflow: 'ellipsis',
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any,
                        }}>
                          {ticket.description}
                        </div>
                      )}

                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 16,
                        marginTop: 10, fontSize: 12, color: 'var(--nexus-text-muted)',
                      }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={12} /> {ticket.spaceName}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={12} /> {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                        </span>
                        {ticket.costEstimate && (
                          <span>Est. ${ticket.costEstimate}</span>
                        )}
                        <span>Reported by {ticket.reporterName}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      {ticket.status === 'vendor_assigned' && (
                        <button
                          className="btn-primary"
                          style={{ padding: '8px 16px', fontSize: 12 }}
                          onClick={() => handleUpdateStatus(ticket.id, 'in_progress')}
                        >
                          Start Job
                        </button>
                      )}
                      {ticket.status === 'in_progress' && (
                        <button
                          className="btn-primary"
                          style={{ padding: '8px 16px', fontSize: 12, background: 'var(--nexus-positive)' }}
                          onClick={() => handleUpdateStatus(ticket.id, 'resolved')}
                        >
                          Mark Complete
                        </button>
                      )}
                      <button
                        className="btn-secondary"
                        style={{ padding: '8px 12px', fontSize: 12 }}
                        onClick={() => router.push('/maintenance')}
                      >
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recently Completed */}
      {completed.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Recently Completed</h2>
          <div className="nexus-card" style={{ padding: 0, overflow: 'hidden' }}>
            {completed.map((ticket, i) => (
              <div
                key={ticket.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 20px',
                  borderBottom: i < completed.length - 1 ? '1px solid var(--nexus-border)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(52, 168, 83, 0.15)',
                  }}>
                    <CheckCircle size={16} style={{ color: 'var(--nexus-positive)' }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{ticket.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--nexus-text-muted)' }}>
                      {ticket.spaceName} · {ticket.category || 'general'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {ticket.costEstimate && (
                    <span style={{ fontWeight: 600, fontSize: 14, fontFamily: 'var(--font-display)' }}>
                      ${ticket.costEstimate}
                    </span>
                  )}
                  <span className="badge badge-positive">Completed</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: 32, color: 'var(--nexus-text-muted)' }}>
          Loading work orders...
        </div>
      )}
    </div>
  );
}
