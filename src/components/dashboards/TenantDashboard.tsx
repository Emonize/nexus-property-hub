 
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CreditCard, Wrench, FileText, Shield, CheckCircle,
  AlertTriangle, Clock, ChevronRight, Calendar, DollarSign,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow, format, isPast, parseISO } from 'date-fns';
import ActionQueue from '@/components/dashboard/ActionQueue';
import { useRealtimeTable } from '@/lib/hooks/useRealtimeTable';
import type { TenantKPIs, TenantActionItem } from '@/lib/actions/tenant-dashboard';
import { getTenantDashboardData } from '@/lib/actions/tenant-dashboard';

export default function TenantDashboard() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<TenantKPIs>({
    nextPayment: null,
    activeRequests: 0,
    lease: null,
    trustScore: null,
  });
  const [actions, setActions] = useState<TenantActionItem[]>([]);
  const [recentPayments, setRecentPayments] = useState<
    Array<{ amount: number; dueDate: string; status: string; spaceName: string }>
  >([]);
  const [dismissedActions, setDismissedActions] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    try {
      const data = await getTenantDashboardData();
      setKpis(data.kpis);
      setActions(data.actions);
      setRecentPayments(data.recentPayments);
    } catch {
      // Graceful fallback — show empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, [fetchData]);

  // Real-time subscriptions
  useRealtimeTable('rent_payments', fetchData);
  useRealtimeTable('maintenance_tickets', fetchData);

  const handleActionApprove = (id: string, type: string) => {
    switch (type) {
      case 'maintenance': router.push('/maintenance'); break;
      case 'payment': router.push('/payments'); break;
      case 'lease': router.push('/leases'); break;
      default: router.push('/notifications');
    }
  };

  const handleActionSnooze = (id: string) => {
    setDismissedActions(prev => new Set(prev).add(id));
  };

  const visibleActions = actions.filter(a => !dismissedActions.has(a.id));

  if (!mounted) return null;

  const paymentOverdue = kpis.nextPayment && isPast(parseISO(kpis.nextPayment.dueDate));
  const paymentFailed = kpis.nextPayment?.status === 'failed';

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 32 }}>
        <div>
          <h1 className="page-title">My Home</h1>
          <p className="page-subtitle">
            {kpis.lease
              ? `${kpis.lease.spaceName} · Lease ${kpis.lease.status}`
              : 'Welcome back. Connect a lease to get started.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" style={{ fontSize: 13 }} onClick={() => router.push('/maintenance')}>
            <Wrench size={14} style={{ marginRight: 4 }} />
            Report Issue
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid-3" style={{ marginBottom: 24 }}>
        {/* Next Rent Due */}
        <div
          className="kpi-card"
          onClick={() => router.push('/payments')}
          style={{ cursor: 'pointer' }}
        >
          <div className="kpi-label">
            <CreditCard size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Next Rent Due
          </div>
          {kpis.nextPayment ? (
            <>
              <div
                className="kpi-value"
                style={{
                  color: paymentFailed
                    ? 'var(--nexus-critical)'
                    : paymentOverdue
                      ? 'var(--nexus-warning)'
                      : 'var(--nexus-text)',
                }}
              >
                ${kpis.nextPayment.amount.toLocaleString()}
              </div>
              <div style={{ fontSize: 13, marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                {paymentFailed ? (
                  <span style={{ color: 'var(--nexus-critical)', fontWeight: 600 }}>
                    <AlertTriangle size={12} style={{ marginRight: 4 }} />
                    Payment Failed
                  </span>
                ) : paymentOverdue ? (
                  <span style={{ color: 'var(--nexus-warning)', fontWeight: 600 }}>
                    <Clock size={12} style={{ marginRight: 4 }} />
                    Overdue — due {format(parseISO(kpis.nextPayment.dueDate), 'MMM d')}
                  </span>
                ) : (
                  <span style={{ color: 'var(--nexus-text-secondary)' }}>
                    <Calendar size={12} style={{ marginRight: 4 }} />
                    Due {format(parseISO(kpis.nextPayment.dueDate), 'MMM d, yyyy')}
                  </span>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="kpi-value" style={{ color: 'var(--nexus-positive)' }}>$0</div>
              <div style={{ fontSize: 13, color: 'var(--nexus-text-secondary)', marginTop: 8 }}>
                No balances due
              </div>
            </>
          )}
        </div>

        {/* Active Maintenance Requests */}
        <div
          className="kpi-card"
          onClick={() => router.push('/maintenance')}
          style={{ cursor: 'pointer' }}
        >
          <div className="kpi-label">
            <Wrench size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Active Requests
          </div>
          <div
            className="kpi-value"
            style={{
              color: kpis.activeRequests > 0 ? 'var(--nexus-warning)' : 'var(--nexus-text-muted)',
            }}
          >
            {kpis.activeRequests}
          </div>
          <div style={{ fontSize: 13, color: 'var(--nexus-text-secondary)', marginTop: 8 }}>
            {kpis.activeRequests === 0
              ? 'No active maintenance'
              : `${kpis.activeRequests} open request${kpis.activeRequests > 1 ? 's' : ''}`}
          </div>
        </div>

        {/* Lease Status */}
        <div
          className="kpi-card"
          onClick={() => router.push('/leases')}
          style={{ cursor: 'pointer' }}
        >
          <div className="kpi-label">
            <FileText size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Lease Status
          </div>
          {kpis.lease ? (
            <>
              <div
                className="kpi-value"
                style={{
                  fontSize: 24,
                  paddingBottom: 6,
                  color: kpis.lease.status === 'active'
                    ? 'var(--nexus-positive)'
                    : 'var(--nexus-warning)',
                }}
              >
                {kpis.lease.status === 'active' ? 'Active' : 'Pending'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--nexus-text-secondary)', marginTop: 8 }}>
                ${kpis.lease.monthlyRent.toLocaleString()}/mo
                {kpis.lease.endDate && ` · Ends ${format(parseISO(kpis.lease.endDate), 'MMM yyyy')}`}
                {kpis.lease.autoRenew && ' · Auto-renew'}
              </div>
            </>
          ) : (
            <>
              <div className="kpi-value" style={{ color: 'var(--nexus-text-muted)', fontSize: 24, paddingBottom: 6 }}>
                Not Active
              </div>
              <div style={{ fontSize: 13, color: 'var(--nexus-text-secondary)', marginTop: 8 }}>
                No lease connected
              </div>
            </>
          )}
        </div>
      </div>

      {/* Trust Score (if available) */}
      {kpis.trustScore !== null && (
        <div
          className="nexus-card"
          style={{ marginBottom: 24, cursor: 'pointer' }}
          onClick={() => router.push('/trust')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: kpis.trustScore >= 700
                  ? 'rgba(52, 168, 83, 0.15)'
                  : kpis.trustScore >= 400
                    ? 'rgba(251, 188, 4, 0.15)'
                    : 'rgba(234, 67, 53, 0.15)',
              }}>
                <Shield size={20} style={{
                  color: kpis.trustScore >= 700
                    ? 'var(--nexus-positive)'
                    : kpis.trustScore >= 400
                      ? 'var(--nexus-warning)'
                      : 'var(--nexus-critical)',
                }} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Trust Score</div>
                <div style={{ fontSize: 13, color: 'var(--nexus-text-secondary)' }}>
                  {kpis.trustScore >= 800 ? 'Excellent' :
                    kpis.trustScore >= 700 ? 'Good' :
                    kpis.trustScore >= 400 ? 'Fair' : 'Needs Attention'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontSize: 28, fontWeight: 800,
                fontFamily: 'var(--font-display)',
                color: kpis.trustScore >= 700
                  ? 'var(--nexus-positive)'
                  : kpis.trustScore >= 400
                    ? 'var(--nexus-warning)'
                    : 'var(--nexus-critical)',
              }}>
                {kpis.trustScore}
              </span>
              <span style={{ fontSize: 13, color: 'var(--nexus-text-muted)' }}>/1000</span>
              <ChevronRight size={16} style={{ color: 'var(--nexus-text-muted)' }} />
            </div>
          </div>
        </div>
      )}

      {/* Action Queue */}
      <ActionQueue
        items={visibleActions}
        onApprove={handleActionApprove}
        onSnooze={handleActionSnooze}
      />

      {/* Recent Payment History */}
      {recentPayments.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>Payment History</h2>
              <p style={{ fontSize: 13, color: 'var(--nexus-text-secondary)', marginTop: 4 }}>
                Your recent rent payments
              </p>
            </div>
            <button
              className="btn-secondary"
              style={{ fontSize: 12, padding: '6px 12px' }}
              onClick={() => router.push('/payments')}
            >
              View All
            </button>
          </div>

          <div className="nexus-card" style={{ padding: 0, overflow: 'hidden' }}>
            {recentPayments.map((payment, i) => {
              const overdue = payment.status === 'pending' && isPast(parseISO(payment.dueDate));
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 20px',
                    borderBottom: i < recentPayments.length - 1 ? '1px solid var(--nexus-border)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: payment.status === 'paid'
                        ? 'rgba(52, 168, 83, 0.15)'
                        : payment.status === 'failed'
                          ? 'rgba(234, 67, 53, 0.15)'
                          : 'rgba(251, 188, 4, 0.15)',
                    }}>
                      <DollarSign size={16} style={{
                        color: payment.status === 'paid'
                          ? 'var(--nexus-positive)'
                          : payment.status === 'failed'
                            ? 'var(--nexus-critical)'
                            : 'var(--nexus-warning)',
                      }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{payment.spaceName}</div>
                      <div style={{ fontSize: 12, color: 'var(--nexus-text-muted)' }}>
                        {format(parseISO(payment.dueDate), 'MMM d, yyyy')}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                      ${payment.amount.toLocaleString()}
                    </span>
                    <span className={`badge ${
                      payment.status === 'paid' ? 'badge-positive' :
                      payment.status === 'failed' ? 'badge-critical' :
                      overdue ? 'badge-warning' :
                      'badge-neutral'
                    }`}>
                      {payment.status === 'paid' ? 'Paid' :
                       payment.status === 'failed' ? 'Failed' :
                       overdue ? 'Overdue' : 'Pending'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 32, color: 'var(--nexus-text-muted)' }}>
          Loading your dashboard...
        </div>
      )}
    </div>
  );
}
