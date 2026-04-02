'use client';

import { useState, useEffect, useCallback } from 'react';
import { Home, FileText, CreditCard, Wrench, AlertTriangle, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function TenantDashboard() {
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
          <h1 className="page-title">My Home</h1>
          <p className="page-subtitle">Welcome back. Here is your current property status.</p>
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: 24 }}>
        <div className="kpi-card" onClick={() => router.push('/payments')} style={{ cursor: 'pointer' }}>
          <div className="kpi-label">Next Rent Due</div>
          <div className="kpi-value" style={{ color: 'var(--nexus-text-muted)' }}>$0</div>
          <div style={{ fontSize: 13, color: 'var(--nexus-text-secondary)', marginTop: 8 }}>No balances due</div>
        </div>
        
        <div className="kpi-card" onClick={() => router.push('/maintenance')} style={{ cursor: 'pointer' }}>
          <div className="kpi-label">Active Requests</div>
          <div className="kpi-value" style={{ color: 'var(--nexus-text-muted)' }}>0</div>
          <div style={{ fontSize: 13, color: 'var(--nexus-text-secondary)', marginTop: 8 }}>No active maintenance</div>
        </div>

        <div className="kpi-card" onClick={() => router.push('/leases')} style={{ cursor: 'pointer' }}>
          <div className="kpi-label">Lease Status</div>
          <div className="kpi-value" style={{ color: 'var(--nexus-text-muted)', fontSize: 24, paddingBottom: 6 }}>Not Active</div>
          <div style={{ fontSize: 13, color: 'var(--nexus-text-secondary)', marginTop: 8 }}>No lease connected</div>
        </div>
      </div>

      <div className="nexus-card">
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle size={18} style={{ color: 'var(--nexus-positive)' }} />
          Action Required
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, background: 'var(--nexus-bg-hover)', borderRadius: 12 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 600, color: 'var(--nexus-text-primary)' }}>You're all caught up!</div>
            <div style={{ fontSize: 13, color: 'var(--nexus-text-secondary)' }}>No documents require your signature.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
