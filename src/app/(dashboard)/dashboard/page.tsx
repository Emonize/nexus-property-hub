'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PulseBar from '@/components/dashboard/PulseBar';
import MoneyMap from '@/components/dashboard/MoneyMap';
import ActionQueue from '@/components/dashboard/ActionQueue';
import HierarchyNavigator from '@/components/spaces/HierarchyNavigator';
import type { DashboardKPIs, Space } from '@/types/database';

// Demo data used as fallback when no real data exists
const demoKPIs: DashboardKPIs = {
  totalCashFlow: 8200,
  cashFlowTrend: [5800, 6200, 7100, 7800, 8000, 8200],
  collectionRate: 85.7,
  totalPayments: 7,
  collectedPayments: 6,
  urgentRepairs: 1,
  criticalRepairs: 0,
};

const demoSpaces: Space[] = [
  { id: 'b001', parent_id: null, owner_id: 'a001', name: 'Rentova Tower', type: 'building', address: null, floor_plan_url: null, area_sqft: 12000, base_rent: null, currency: 'usd', amenities: [], status: 'occupied', listing_photos: [], meta: {}, created_at: '', updated_at: '' },
  { id: 'b010', parent_id: 'b001', owner_id: 'a001', name: 'Unit 1A', type: 'unit', address: null, floor_plan_url: null, area_sqft: 1200, base_rent: 3200, currency: 'usd', amenities: ['washer_dryer', 'dishwasher'], status: 'occupied', listing_photos: [], meta: {}, created_at: '', updated_at: '' },
  { id: 'b011', parent_id: 'b001', owner_id: 'a001', name: 'Unit 2B', type: 'unit', address: null, floor_plan_url: null, area_sqft: 950, base_rent: 2800, currency: 'usd', amenities: [], status: 'occupied', listing_photos: [], meta: {}, created_at: '', updated_at: '' },
  { id: 'b012', parent_id: 'b001', owner_id: 'a001', name: 'Unit 3C', type: 'unit', address: null, floor_plan_url: null, area_sqft: 800, base_rent: 2200, currency: 'usd', amenities: [], status: 'vacant', listing_photos: [], meta: {}, created_at: '', updated_at: '' },
  { id: 'b013', parent_id: 'b001', owner_id: 'a001', name: 'Garage Bay A', type: 'garage', address: null, floor_plan_url: null, area_sqft: 200, base_rent: 350, currency: 'usd', amenities: [], status: 'listed', listing_photos: [], meta: {}, created_at: '', updated_at: '' },
  { id: 'b100', parent_id: 'b010', owner_id: 'a001', name: 'Bedroom 1', type: 'room', address: null, floor_plan_url: null, area_sqft: 300, base_rent: 1200, currency: 'usd', amenities: [], status: 'occupied', listing_photos: [], meta: {}, created_at: '', updated_at: '' },
  { id: 'b101', parent_id: 'b010', owner_id: 'a001', name: 'Bedroom 2', type: 'room', address: null, floor_plan_url: null, area_sqft: 280, base_rent: 1100, currency: 'usd', amenities: [], status: 'occupied', listing_photos: [], meta: {}, created_at: '', updated_at: '' },
  { id: 'b102', parent_id: 'b010', owner_id: 'a001', name: 'Bedroom 3', type: 'room', address: null, floor_plan_url: null, area_sqft: 250, base_rent: 900, currency: 'usd', amenities: [], status: 'occupied', listing_photos: [], meta: {}, created_at: '', updated_at: '' },
];

const demoTreemapData = [
  { id: 'b100', name: 'Bedroom 1', type: 'room', rent: 1200, status: 'paid' as const },
  { id: 'b101', name: 'Bedroom 2', type: 'room', rent: 1100, status: 'paid' as const },
  { id: 'b102', name: 'Bedroom 3', type: 'room', rent: 900, status: 'pending' as const },
  { id: 'b011', name: 'Unit 2B', type: 'unit', rent: 2800, status: 'paid' as const },
  { id: 'b012', name: 'Unit 3C', type: 'unit', rent: 2200, status: 'vacant' as const },
  { id: 'b013', name: 'Garage Bay A', type: 'garage', rent: 350, status: 'paid' as const },
];

const demoActions = [
  { id: '1', type: 'maintenance' as const, title: 'Leaking kitchen faucet', subtitle: 'Bedroom 1 · Alex Rivera', timestamp: new Date(Date.now() - 3600000).toISOString(), severity: 'high', cta: 'Approve Repair $280', amount: 280 },
  { id: '2', type: 'payment' as const, title: 'Rent overdue — Bedroom 3', subtitle: 'Priya Sharma · Due Mar 1', timestamp: new Date(Date.now() - 86400000 * 5).toISOString(), severity: undefined, cta: 'Send Reminder', amount: 900 },
  { id: '3', type: 'lease' as const, title: 'New application received', subtitle: 'Unit 3C · Jamie Wilson · Trust: 780', timestamp: new Date(Date.now() - 7200000).toISOString(), severity: undefined, cta: 'Review', amount: undefined },
];

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemoMode = searchParams.get('demo') === 'true';

  const emptyKPIs: DashboardKPIs = {
    totalCashFlow: 0, cashFlowTrend: [], collectionRate: 0,
    totalPayments: 0, collectedPayments: 0, urgentRepairs: 0, criticalRepairs: 0
  };

  const [kpis, setKpis] = useState<DashboardKPIs>(isDemoMode ? demoKPIs : emptyKPIs);
  const [spaces, setSpaces] = useState<Space[]>(isDemoMode ? demoSpaces : []);
  const [treemapData, setTreemapData] = useState(isDemoMode ? demoTreemapData : []);
  const [actions, setActions] = useState(isDemoMode ? demoActions : []);
  const [mounted, setMounted] = useState(false);
  const [isLive, setIsLive] = useState(!isDemoMode);
  const [dismissedActions, setDismissedActions] = useState<Set<string>>(new Set());

  const fetchDashboardData = useCallback(async () => {
    try {
      let isLiveSpaces = false;
      let isLiveKpis = false;
      let liveKpiData: DashboardKPIs | null = null;
      let liveSpacesData: Space[] = [];

      // Fetch KPIs
      const kpiRes = await fetch('/api/dashboard/kpis');
      if (kpiRes.ok) {
        const kpiData = await kpiRes.json();
        if (kpiData?.data) {
          liveKpiData = kpiData.data;
          if (kpiData.data.totalPayments > 0 || kpiData.data.urgentRepairs > 0) {
            isLiveKpis = true;
          }
        }
      }

      // Fetch spaces
      const spacesRes = await fetch('/api/dashboard/spaces');
      if (spacesRes.ok) {
        const spacesData = await spacesRes.json();
        if (spacesData?.data && spacesData.data.length > 0) {
          liveSpacesData = spacesData.data;
          isLiveSpaces = true;
        }
      }

      // Core logic: If user is strictly not in demo mode, ALWAYS sync the exact database state (even if empty zeros).
      if (!isDemoMode) {
        setIsLive(true);
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
      }

      // Fetch action queue items
      const actionsRes = await fetch('/api/dashboard/actions');
      if (actionsRes.ok && !isDemoMode) {
        const actionsData = await actionsRes.json();
        if (actionsData?.items) {
          setActions(actionsData.items);
        }
      }
    } catch {
      // API error handler
    }
  }, [isDemoMode]);

  useEffect(() => {
    setMounted(true);
    fetchDashboardData();
  }, [fetchDashboardData]);

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
            {!isLive && (
              <span style={{ marginLeft: 12, padding: '2px 8px', borderRadius: 6, background: 'rgba(251, 188, 4, 0.15)', color: 'var(--nexus-warning)', fontSize: 11, fontWeight: 600 }}>
                DEMO MODE
              </span>
            )}
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
