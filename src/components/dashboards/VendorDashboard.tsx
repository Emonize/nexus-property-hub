'use client';

import { useState, useEffect } from 'react';
import { Wrench, CheckCircle, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function VendorDashboard() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fade-in">
      <div className="page-header" style={{ marginBottom: 32 }}>
        <div>
          <h1 className="page-title">Work Orders</h1>
          <p className="page-subtitle">Nexus Service Provider Portal</p>
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: 24 }}>
        <div className="kpi-card" onClick={() => router.push('/maintenance')} style={{ cursor: 'pointer' }}>
          <div className="kpi-label">Assigned Tickets</div>
          <div className="kpi-value" style={{ color: 'var(--nexus-warning)' }}>3</div>
          <div style={{ fontSize: 13, color: 'var(--nexus-text-secondary)', marginTop: 8 }}>Awaiting dispatch</div>
        </div>
        
        <div className="kpi-card">
          <div className="kpi-label">In Progress</div>
          <div className="kpi-value" style={{ color: 'var(--nexus-info)' }}>2</div>
          <div style={{ fontSize: 13, color: 'var(--nexus-text-secondary)', marginTop: 8 }}>Active jobs on-site</div>
        </div>

        <div className="kpi-card" onClick={() => router.push('/payments')} style={{ cursor: 'pointer' }}>
          <div className="kpi-label">Pending Payouts</div>
          <div className="kpi-value" style={{ color: 'var(--nexus-positive)' }}>$450</div>
          <div style={{ fontSize: 13, color: 'var(--nexus-text-secondary)', marginTop: 8 }}>Invoice processing via ACH</div>
        </div>
      </div>
    </div>
  );
}
