'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileText, Plus, Users, Calendar, Search, X, Loader2 } from 'lucide-react';
import type { LeaseStatus, LeaseType, Space } from '@/types/database';
import { createLease } from '@/lib/actions/leases';

interface LeaseRow {
  id: string;
  space_name: string;
  tenant_name: string;
  lease_type: string;
  start_date: string;
  end_date: string | null;
  monthly_rent: number;
  split_pct: number;
  status: LeaseStatus;
  split_group: boolean;
}

const demoLeases: LeaseRow[] = [
  { id: 'c001', space_name: 'Bedroom 1', tenant_name: 'Alex Rivera', lease_type: 'Fixed', start_date: '2026-01-01', end_date: '2027-01-01', monthly_rent: 1200, split_pct: 37.5, status: 'active', split_group: true },
  { id: 'c002', space_name: 'Bedroom 2', tenant_name: 'Jordan Park', lease_type: 'Fixed', start_date: '2026-01-01', end_date: '2027-01-01', monthly_rent: 1100, split_pct: 34.38, status: 'active', split_group: true },
  { id: 'c003', space_name: 'Bedroom 3', tenant_name: 'Priya Sharma', lease_type: 'Fixed', start_date: '2026-01-01', end_date: '2027-01-01', monthly_rent: 900, split_pct: 28.12, status: 'active', split_group: true },
  { id: 'c004', space_name: 'Unit 2B', tenant_name: 'Alex Rivera', lease_type: 'Month-to-Month', start_date: '2026-02-01', end_date: null, monthly_rent: 2800, split_pct: 100, status: 'active', split_group: false },
];

const statusStyles: Record<string, string> = {
  active: 'badge-positive',
  pending: 'badge-warning',
  expired: 'badge-critical',
  terminated: 'badge-critical',
  draft: 'badge-neutral',
};

const LEASE_TYPES: { value: LeaseType; label: string }[] = [
  { value: 'fixed', label: 'Fixed Term' },
  { value: 'month_to_month', label: 'Month-to-Month' },
  { value: 'daily', label: 'Daily' },
  { value: 'hourly', label: 'Hourly' },
];

// ─── New Lease Modal ──────────────────────────────────────────────────────────

function NewLeaseModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [spaceId, setSpaceId] = useState('');
  const [tenantEmail, setTenantEmail] = useState('');
  const [leaseType, setLeaseType] = useState<LeaseType>('fixed');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [monthlyRent, setMonthlyRent] = useState('');
  const [deposit, setDeposit] = useState('');
  const [paymentDay, setPaymentDay] = useState('1');
  const [splitPct, setSplitPct] = useState('100');
  const [autoRenew, setAutoRenew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Available spaces for dropdown
  const [spaces, setSpaces] = useState<Space[]>([]);
  // Available tenants for dropdown
  const [tenants, setTenants] = useState<{ id: string; name: string; email: string }[]>([]);

  useEffect(() => {
    // Fetch spaces
    import('@/lib/actions/spaces').then(m => m.getSpaces())
      .then(d => { if (d?.data) setSpaces(d.data); })
      .catch(() => {});

    // Fetch tenants
    import('@/lib/actions/tenants').then(m => m.getTenants())
      .then(d => {
        if (d?.data) {
          setTenants(d.data.map((t: Record<string, unknown>) => ({
            id: t.id as string,
            name: (t.full_name || t.email || 'Unknown') as string,
            email: (t.email || '') as string,
          })));
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!spaceId) { setError('Please select a space'); return; }
    if (!tenantEmail && tenants.length === 0) { setError('Please enter a tenant email'); return; }
    if (!monthlyRent || Number(monthlyRent) <= 0) { setError('Please enter a valid monthly rent'); return; }

    // Resolve tenant ID
    let tenantId = '';
    if (tenants.length > 0 && tenantEmail) {
      // tenantEmail here is actually the selected tenant ID from the dropdown
      tenantId = tenantEmail;
    } else {
      setError('No tenants available. Please add tenants first.');
      return;
    }

    setSaving(true);

    const result = await createLease({
      space_id: spaceId,
      tenant_id: tenantId,
      lease_type: leaseType,
      start_date: startDate,
      end_date: endDate || undefined,
      monthly_rent: Number(monthlyRent),
      deposit: deposit ? Number(deposit) : undefined,
      payment_day: paymentDay ? Number(paymentDay) : undefined,
      split_pct: splitPct ? Number(splitPct) : undefined,
      auto_renew: autoRenew,
    });

    if (result.error) {
      setError(result.error);
      setSaving(false);
    } else {
      onSuccess();
      onClose();
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
    }} onClick={onClose}>
      <div className="glass-card fade-in" style={{
        width: '100%', maxWidth: 600, maxHeight: '90vh', overflow: 'auto',
        padding: 32, position: 'relative',
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-display)' }}>New Lease</h2>
            <p style={{ fontSize: 13, color: 'var(--nexus-text-muted)', marginTop: 4 }}>Create a new tenant lease agreement</p>
          </div>
          <button onClick={onClose} className="btn-secondary" style={{ width: 36, height: 36, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10 }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Space & Tenant */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label className="nexus-label">Space *</label>
              <select className="nexus-select" value={spaceId} onChange={e => setSpaceId(e.target.value)}>
                <option value="">Select a space...</option>
                {spaces.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.base_rent ? `($${Number(s.base_rent).toLocaleString()}/mo)` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="nexus-label">Tenant *</label>
              {tenants.length > 0 ? (
                <select className="nexus-select" value={tenantEmail} onChange={e => setTenantEmail(e.target.value)}>
                  <option value="">Select a tenant...</option>
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.email})</option>
                  ))}
                </select>
              ) : (
                <input
                  className="nexus-input"
                  placeholder="Tenant email"
                  value={tenantEmail}
                  onChange={e => setTenantEmail(e.target.value)}
                />
              )}
            </div>
          </div>

          {/* Lease Type & Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label className="nexus-label">Lease Type</label>
              <select className="nexus-select" value={leaseType} onChange={e => setLeaseType(e.target.value as LeaseType)}>
                {LEASE_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="nexus-label">Start Date *</label>
              <input className="nexus-input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="nexus-label">End Date</label>
              <input className="nexus-input" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>

          {/* Rent & Deposit */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label className="nexus-label">Monthly Rent ($) *</label>
              <input className="nexus-input" type="number" placeholder="2500" value={monthlyRent} onChange={e => setMonthlyRent(e.target.value)} />
            </div>
            <div>
              <label className="nexus-label">Security Deposit ($)</label>
              <input className="nexus-input" type="number" placeholder="2500" value={deposit} onChange={e => setDeposit(e.target.value)} />
            </div>
            <div>
              <label className="nexus-label">Payment Day</label>
              <input className="nexus-input" type="number" min="1" max="28" placeholder="1" value={paymentDay} onChange={e => setPaymentDay(e.target.value)} />
            </div>
          </div>

          {/* Split & Auto-renew */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div>
              <label className="nexus-label">Split Percentage (%)</label>
              <input className="nexus-input" type="number" min="1" max="100" value={splitPct} onChange={e => setSplitPct(e.target.value)} />
              <div style={{ fontSize: 11, color: 'var(--nexus-text-muted)', marginTop: 4 }}>
                Set to less than 100% for shared spaces
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', paddingTop: 22 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                <input
                  type="checkbox"
                  checked={autoRenew}
                  onChange={e => setAutoRenew(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: 'var(--nexus-primary)' }}
                />
                Auto-renew lease
              </label>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, marginBottom: 16,
              background: 'rgba(234, 67, 53, 0.1)', border: '1px solid rgba(234, 67, 53, 0.2)',
              color: 'var(--nexus-critical)', fontSize: 13,
            }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving} style={{ minWidth: 140 }}>
              {saving
                ? <><Loader2 size={14} className="spin" /> Creating...</>
                : <><Plus size={14} /> Create Lease</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LeasesPage() {
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [leases, setLeases] = useState<LeaseRow[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);

  const fetchLeases = useCallback(async () => {
    try {
      const { getLeases } = await import('@/lib/actions/leases');
      const data = await getLeases();
      if (data && !data.error && data.data) {
        const mapped: LeaseRow[] = (data.data as Record<string, unknown>[]).map(l => ({
            id: l.id as string,
            space_name: (l.space as Record<string, unknown>)?.name as string || 'Unknown',
            tenant_name: ((l.tenant as Record<string, unknown>)?.full_name as string) || 'Unknown',
            lease_type: (l.lease_type === 'fixed' ? 'Fixed' : l.lease_type === 'month_to_month' ? 'Month-to-Month' : String(l.lease_type)) as LeaseType | string,
            start_date: l.start_date as string,
            end_date: l.end_date as string | null,
            monthly_rent: Number(l.monthly_rent),
            split_pct: Number(l.split_pct),
            status: l.status as LeaseStatus,
            split_group: !!l.split_group_id,
          }));
          setLeases(mapped);
          setIsLive(true);
        }
    } catch {
      // Keep demo data
    }
  }, []);

  useEffect(() => {
    fetchLeases();
  }, [fetchLeases]);

  const filtered = leases.filter(l =>
    (filter === 'all' || l.status === filter) &&
    (l.tenant_name.toLowerCase().includes(search.toLowerCase()) || l.space_name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Leases</h1>
          <p className="page-subtitle">
            Manage tenant agreements and split groups
            {!isLive && (
              <span style={{ marginLeft: 12, padding: '2px 8px', borderRadius: 6, background: 'rgba(251, 188, 4, 0.15)', color: 'var(--nexus-warning)', fontSize: 11, fontWeight: 600 }}>
                DEMO MODE
              </span>
            )}
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowNewModal(true)}>
          <Plus size={16} /> New Lease
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--nexus-text-muted)' }} />
          <input className="nexus-input" placeholder="Search by tenant or space..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 40 }} />
        </div>
        {['all', 'active', 'pending', 'expired'].map(f => (
          <button key={f} className={filter === f ? 'btn-primary' : 'btn-secondary'} style={{ padding: '8px 16px', fontSize: 13, textTransform: 'capitalize' }} onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
      </div>

      {/* Lease Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.map((lease, i) => (
          <div key={lease.id} className="nexus-card slide-up" style={{ animationDelay: `${i * 50}ms`, display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(108, 99, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FileText size={20} style={{ color: 'var(--nexus-primary-light)' }} />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{lease.space_name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, fontSize: 13, color: 'var(--nexus-text-secondary)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Users size={13} /> {lease.tenant_name}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={13} /> {lease.lease_type}</span>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--nexus-accent)' }}>
                ${lease.monthly_rent.toLocaleString()}
                <span style={{ fontSize: 12, color: 'var(--nexus-text-muted)', fontWeight: 400 }}>/mo</span>
              </div>
              {lease.split_group && (
                <div style={{ fontSize: 11, color: 'var(--nexus-text-muted)', marginTop: 2 }}>
                  Split: {lease.split_pct}%
                </div>
              )}
            </div>

            <span className={`badge ${statusStyles[lease.status]}`}>{lease.status}</span>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="nexus-card" style={{ padding: 40, textAlign: 'center', color: 'var(--nexus-text-muted)' }}>
            No leases found
          </div>
        )}
      </div>

      {/* New Lease Modal */}
      {showNewModal && (
        <NewLeaseModal
          onClose={() => setShowNewModal(false)}
          onSuccess={fetchLeases}
        />
      )}
    </div>
  );
}
