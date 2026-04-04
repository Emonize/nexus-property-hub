'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import ActionQueue from '@/components/dashboard/ActionQueue';
import HierarchyNavigator from '@/components/spaces/HierarchyNavigator';
import { useRealtimeTable } from '@/lib/hooks/useRealtimeTable';
import type { DashboardKPIs, Space } from '@/types/database';

const PulseBar = dynamic(() => import('@/components/dashboard/PulseBar'), {
  ssr: false,
  loading: () => <div className="skeleton" style={{ height: 180, marginBottom: 32 }} />
});

const MoneyMap = dynamic(() => import('@/components/dashboard/MoneyMap'), {
  ssr: false,
  loading: () => <div className="skeleton" style={{ height: 400, marginBottom: 32 }} />
});

function DashboardContent() {
  const router = useRouter();
  const emptyKPIs: DashboardKPIs = {
    totalCashFlow: 0, cashFlowTrend: [], collectionRate: 0,
    totalPayments: 0, collectedPayments: 0, urgentRepairs: 0, criticalRepairs: 0
  };

  const [kpis, setKpis] = useState<DashboardKPIs>(emptyKPIs);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [treemapData, setTreemapData] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);
  const [dismissedActions, setDismissedActions] = useState<Set<string>>(new Set());

  const fetchDashboardData = useCallback(async () => {
    try {
      let isLiveSpaces = false;
      let isLiveKpis = false;
      let liveKpiData: DashboardKPIs | null = null;
      let liveSpacesData: Space[] = [];

      // Fetch KPIs
      const { getDashboardKPIs } = await import('@/lib/actions/payments');
      const kpiData = await getDashboardKPIs();
      if (kpiData?.data) {
        liveKpiData = kpiData.data;
        if (kpiData.data.totalPayments > 0 || kpiData.data.urgentRepairs > 0) {
          isLiveKpis = true;
        }
      }

      // Fetch spaces
      const { getSpaces } = await import('@/lib/actions/spaces');
      const spacesData = await getSpaces();
      if (spacesData && !spacesData.error && spacesData.data) {
        liveSpacesData = spacesData.data;
        isLiveSpaces = true;
      }

      // Core logic: ALWAYS sync the exact database state (even if empty zeros).
      if (liveKpiData) setKpis(liveKpiData);
      
      setSpaces(liveSpacesData);
      const rentable = liveSpacesData.filter((s: Space) => s.base_rent && Number(s.base_rent) > 0);
      if (rentable.length > 0) {
        setTreemapData(
          rentable.map((s: Space) => ({
            id: s.id,
            name: s.name,
            type: s.type,
            rent: Number(s.base_rent) || 0,
            status: s.status === 'occupied' ? ('paid' as const) : s.status === 'vacant' ? ('vacant' as const) : ('pending' as const),
          }))
        );
      } else {
        setTreemapData([]);
      }

      // Fetch action queue items
      const { getActionQueueItems } = await import('@/lib/actions/maintenance');
      const actionsData = await getActionQueueItems();
      if (actionsData) {
        const formattedActions = [
          ...(actionsData.tickets.map(t => ({
            id: t.id,
            type: 'maintenance' as const,
            title: t.title,
            subtitle: `Space: ${(t.space as Record<string,unknown>)?.name || 'Unknown'}`,
            timestamp: 'Just now',
            severity: t.ai_severity === 'critical' ? 'critical' : t.ai_severity === 'high' ? 'high' : 'medium',
            cta: 'View',
            amount: 0,
          }))),
          ...(actionsData.payments.map(p => ({
            id: String(p.id),
            type: 'payment' as const,
            title: `Late Rent: $${Number(p.amount)}`,
            subtitle: `Tenant: ${(p.tenant as Record<string,unknown>)?.full_name || 'Unknown'} | Due: ${p.due_date}`,
            timestamp: p.due_date as string,
            severity: undefined,
            cta: 'Review',
            amount: Number(p.amount),
          })))
        ];
        if (formattedActions.length > 0) setActions(formattedActions);
      }
    } catch {
      // API error handler
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Real-time subscriptions — refresh dashboard on data changes
  useRealtimeTable('rent_payments', fetchDashboardData);
  useRealtimeTable('maintenance_tickets', fetchDashboardData);
  useRealtimeTable('spaces', fetchDashboardData);

  // Route action queue button clicks to the appropriate page
  const handleActionApprove = (id: string, type: string) => {
    switch (type) {
      case 'maintenance':
        router.push('/maintenance');
        break;
      case 'payment':
        router.push('/payments');
        break;
      case 'lease':
        router.push('/leases');
        break;
      default:
        router.push('/notifications');
    }
  };

  // Snooze = dismiss the action item from the queue
  const handleActionSnooze = (id: string) => {
    setDismissedActions(prev => new Set(prev).add(id));
  };

  // Filter out dismissed actions
  const visibleActions = actions.filter(a => !dismissedActions.has(a.id));

  if (!mounted) return null;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Your property portfolio at a glance
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" style={{ fontSize: 13 }} onClick={() => window.print()}>
            Export Report
          </button>
          <button className="btn-primary" style={{ fontSize: 13 }} onClick={() => router.push('/spaces')}>
            + Add Property
          </button>
        </div>
      </div>

      {/* Row 1: Pulse Bar */}
      <PulseBar kpis={kpis} />

      {/* Row 2: Money Map */}
      <MoneyMap spaces={treemapData} />

      {/* Row 3: Action Queue */}
      <ActionQueue
        items={visibleActions}
        onApprove={handleActionApprove}
        onSnooze={handleActionSnooze}
      />

      {/* Row 4: Hierarchy Navigator */}
      <HierarchyNavigator
        spaces={spaces}
        onSelect={(space) => router.push(`/spaces`)}
        onReparent={(spaceId, newParentId) => router.push('/spaces')}
        onAdd={() => router.push('/spaces')}
      />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div style={{ padding: 48, color: 'var(--nexus-text-secondary)', textAlign: 'center' }}>Loading Dashboard Engine...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
