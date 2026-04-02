'use client';

import { useState, useEffect, useCallback } from 'react';
import { Check, Clock, AlertTriangle, Download, ArrowUpRight } from 'lucide-react';
import type { PaymentStatus } from '@/types/database';
import { createClient } from '@/lib/supabase/client';

interface PaymentRow {
  id: string;
  tenant: string;
  space: string;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: PaymentStatus;
  method: string | null;
}

const demoPayments: PaymentRow[] = [
  { id: 'e001', tenant: 'Alex Rivera', space: 'Bedroom 1', amount: 1200, due_date: '2026-03-01', paid_date: '2026-03-01', status: 'paid', method: 'ACH Transfer' },
  { id: 'e002', tenant: 'Jordan Park', space: 'Bedroom 2', amount: 1100, due_date: '2026-03-01', paid_date: '2026-03-02', status: 'paid', method: 'Credit Card' },
  { id: 'e003', tenant: 'Priya Sharma', space: 'Bedroom 3', amount: 900, due_date: '2026-03-01', paid_date: null, status: 'pending', method: null },
  { id: 'e004', tenant: 'Alex Rivera', space: 'Unit 2B', amount: 2800, due_date: '2026-03-01', paid_date: '2026-03-01', status: 'paid', method: 'ACH Transfer' },
];

const statusConfig: Record<string, { icon: typeof Check; color: string; badge: string }> = {
  paid: { icon: Check, color: 'var(--nexus-positive)', badge: 'badge-positive' },
  pending: { icon: Clock, color: 'var(--nexus-warning)', badge: 'badge-warning' },
  failed: { icon: AlertTriangle, color: 'var(--nexus-critical)', badge: 'badge-critical' },
  processing: { icon: Clock, color: 'var(--nexus-info)', badge: 'badge-info' },
  refunded: { icon: ArrowUpRight, color: 'var(--nexus-text-muted)', badge: 'badge-neutral' },
  partial: { icon: Clock, color: 'var(--nexus-warning)', badge: 'badge-warning' },
};

export default function PaymentsPage() {
  const [filter, setFilter] = useState('all');
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [isLive, setIsLive] = useState(false);

  const fetchPayments = useCallback(async () => {
    try {
      const { getPayments } = await import('@/lib/actions/payments');
      const data = await getPayments();
      if (data && !data.error && data.data) {
        const mapped: PaymentRow[] = (data.data as Record<string, unknown>[]).map((p: Record<string, unknown>) => ({
            id: p.id as string,
            tenant: ((p.tenant as Record<string, unknown>)?.full_name as string) || 'Unknown',
            space: (((p.lease as Record<string, unknown>)?.space as Record<string, unknown>)?.name as string) || 'Unknown',
            amount: Number(p.amount),
            due_date: p.due_date as string,
            paid_date: (p.paid_date as string) || null,
            status: p.status as PaymentStatus,
            method: p.stripe_payment_id ? 'Stripe' : null,
          }));
          setPayments(mapped);
          setIsLive(true);
      }
    } catch {
      // Keep demo data
    }
  }, []);

  useEffect(() => {
    fetchPayments();

    const supabase = createClient();
    const channel = supabase
      .channel('payments_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rent_payments' },
        () => {
          // Re-fetch to seamlessly handle foreign key relations (tenant, spaces)
          fetchPayments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPayments]);

  const filtered = filter === 'all' ? payments : payments.filter(p => p.status === filter);
  const totalCollected = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const totalPending = payments.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Payments</h1>
          <p className="page-subtitle">
            Track rent collection and payment status
            {!isLive && (
              <span style={{ marginLeft: 12, padding: '2px 8px', borderRadius: 6, background: 'rgba(251, 188, 4, 0.15)', color: 'var(--nexus-warning)', fontSize: 11, fontWeight: 600 }}>
                DEMO MODE
              </span>
            )}
          </p>
        </div>
        <button className="btn-secondary"><Download size={16} /> Export</button>
      </div>

      {/* Summary */}
      <div className="grid-3" style={{ marginBottom: 24 }}>
        <div className="kpi-card">
          <div className="kpi-label">Collected</div>
          <div className="kpi-value" style={{ color: 'var(--nexus-positive)' }}>${totalCollected.toLocaleString()}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Pending</div>
          <div className="kpi-value" style={{ color: 'var(--nexus-warning)' }}>${totalPending.toLocaleString()}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Collection Rate</div>
          <div className="kpi-value" style={{ color: 'var(--nexus-primary-light)' }}>
            {totalCollected + totalPending > 0 ? Math.round((totalCollected / (totalCollected + totalPending)) * 100) : 0}%
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['all', 'paid', 'pending', 'failed'].map(f => (
          <button key={f} className={filter === f ? 'btn-primary' : 'btn-secondary'} style={{ padding: '6px 14px', fontSize: 12, textTransform: 'capitalize' }} onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="nexus-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--nexus-border)' }}>
              {['Tenant', 'Space', 'Amount', 'Due Date', 'Method', 'Status', ''].map(h => (
                <th key={h} style={{ padding: '14px 20px', textAlign: 'left', fontSize: 12, color: 'var(--nexus-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const sc = statusConfig[p.status] || statusConfig.pending;
              return (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--nexus-border)', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--nexus-bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '14px 20px', fontWeight: 500 }}>{p.tenant}</td>
                  <td style={{ padding: '14px 20px', color: 'var(--nexus-text-secondary)' }}>{p.space}</td>
                  <td style={{ padding: '14px 20px', fontFamily: 'var(--font-display)', fontWeight: 700 }}>${p.amount.toLocaleString()}</td>
                  <td style={{ padding: '14px 20px', color: 'var(--nexus-text-secondary)' }}>{p.due_date}</td>
                  <td style={{ padding: '14px 20px', color: 'var(--nexus-text-secondary)' }}>{p.method || '—'}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <span className={`badge ${sc.badge}`}>{p.status}</span>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    {p.status === 'pending' && (
                      <button className="btn-primary" style={{ padding: '6px 12px', fontSize: 12 }}>Send Reminder</button>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--nexus-text-muted)' }}>
                  No payments found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
