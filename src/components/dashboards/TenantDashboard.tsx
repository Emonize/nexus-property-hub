'use client';

import { useState, useEffect, useCallback } from 'react';
import { Home, FileText, CreditCard, Wrench, AlertTriangle } from 'lucide-react';
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
          <div className="kpi-value" style={{ color: 'var(--nexus-positive)' }}>$1,200</div>
          <div style={{ fontSize: 13, color: 'var(--nexus-text-secondary)', marginTop: 8 }}>Due on Apr 1, 2026</div>
        </div>
        
        <div className="kpi-card" onClick={() => router.push('/maintenance')} style={{ cursor: 'pointer' }}>
          <div className="kpi-label">Active Requests</div>
          <div className="kpi-value" style={{ color: 'var(--nexus-warning)' }}>1</div>
          <div style={{ fontSize: 13, color: 'var(--nexus-text-secondary)', marginTop: 8 }}>Plumbing issue under review</div>
        </div>

        <div className="kpi-card" onClick={() => router.push('/leases')} style={{ cursor: 'pointer' }}>
          <div className="kpi-label">Lease Status</div>
          <div className="kpi-value" style={{ color: 'var(--nexus-primary-light)' }}>Active</div>
          <div style={{ fontSize: 13, color: 'var(--nexus-text-secondary)', marginTop: 8 }}>Expiring in 8 months</div>
        </div>
      </div>

      <div className="nexus-card">
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={18} style={{ color: 'var(--nexus-warning)' }} />
          Action Required
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, background: 'var(--nexus-bg-hover)', borderRadius: 12 }}>
          <div>
            <div style={{ fontWeight: 600 }}>Sign Renewed Addendum</div>
            <div style={{ fontSize: 13, color: 'var(--nexus-text-secondary)' }}>Pending digital signature for pet policy update.</div>
          </div>
          <button className="btn-primary" onClick={() => router.push('/leases')}>Review Document</button>
        </div>
      </div>
    </div>
  );
}
