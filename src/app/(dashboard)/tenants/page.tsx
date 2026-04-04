'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Plus, Mail, Phone, Shield, Users } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { Virtuoso } from 'react-virtuoso';
import { getTenants } from '@/lib/actions/tenants';

interface TenantRow {
  name: string;
  email: string;
  phone: string;
  spaces: string[];
  trust: number;
  status: string;
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [search, setSearch] = useState('');

  const fetchTenants = useCallback(async () => {
    try {
      const data = await getTenants();
      if (data && !data.error && data.data) {
        const mapped: TenantRow[] = (data.data as Record<string, unknown>[]).map(t => ({
            name: (t.full_name as string) || 'Unknown',
            email: (t.email as string) || '',
            phone: (t.phone as string) || '',
            spaces: Array.isArray(t.leases) 
              ? (t.leases as Record<string, unknown>[])
                  .filter(l => l.status === 'active')
                  .map(l => (l.space as Record<string, unknown>)?.name as string || 'Unknown') 
              : [],
            trust: Array.isArray(t.trust) && (t.trust as Record<string, unknown>[]).length > 0 
              ? Number((t.trust as Record<string, unknown>[])[0].score) 
              : 0,
            status: 'active',
          }));
          setTenants(mapped);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchTenants(); // eslint-disable-line react-hooks/set-state-in-effect -- initial data fetch on mount
  }, [fetchTenants]);

  const filtered = useMemo(() => {
    return search
      ? tenants.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.email.toLowerCase().includes(search.toLowerCase()))
      : tenants;
  }, [tenants, search]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tenants</h1>
          <p className="page-subtitle">
            Manage your tenant directory
          </p>
        </div>
        <button className="btn-primary" aria-label="Invite new tenant"><Plus size={16} /> Invite Tenant</button>
      </div>

      <div style={{ position: 'relative', marginBottom: 24 }}>
        <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--nexus-text-muted)' }} />
        <input className="nexus-input" placeholder="Search tenants..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 40 }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.length > 0 && (
          <Virtuoso
            useWindowScroll
            data={filtered}
            itemContent={(i, t) => (
              <div key={t.name + i} className="nexus-card slide-up nexus-list-row" style={{ animationDelay: `${i * 60}ms`, marginBottom: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, var(--nexus-primary), var(--nexus-accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18, color: 'white', flexShrink: 0 }}>
                  {t.name.charAt(0)}
                </div>

                <div className="nexus-list-content">
                  <div style={{ fontWeight: 600, fontSize: 16 }}>{t.name}</div>
                  <div style={{ display: 'flex', gap: 16, marginTop: 4, fontSize: 13, color: 'var(--nexus-text-secondary)', flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={13} aria-label="Email" /> {t.email}</span>
                    {t.phone && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={13} aria-label="Phone" /> {t.phone}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                    {t.spaces.map(s => <span key={s} className="badge badge-neutral" style={{ fontSize: 11 }}>{s}</span>)}
                  </div>
                </div>

                <div className="nexus-list-actions">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: t.trust >= 800 ? 'var(--nexus-positive)' : 'var(--nexus-warning)' }}>
                    <Shield size={16} aria-label="Trust Score" />
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18 }}>{t.trust}</span>
                  </div>
                  <button className="btn-secondary" style={{ fontSize: 13 }} aria-label={`View tenant ${t.name}`}>View</button>
                </div>
              </div>
            )}
          />
        )}
        {filtered.length === 0 && (
          <EmptyState
            icon={Users}
            title="No Tenants Found"
            description="You do not have any active tenants registered in your portfolio yet."
          />
        )}
      </div>
    </div>
  );
}
