'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Mail, Phone, Shield, Users } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';

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
      const { getTenants } = await import('@/lib/actions/tenants');
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
    } catch {
      setTenants([]);
    }
  }, []);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const filtered = search
    ? tenants.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.email.toLowerCase().includes(search.toLowerCase()))
    : tenants;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tenants</h1>
          <p className="page-subtitle">
            Manage your tenant directory
          </p>
        </div>
        <button className="btn-primary"><Plus size={16} /> Invite Tenant</button>
      </div>

      <div style={{ position: 'relative', marginBottom: 24 }}>
        <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--nexus-text-muted)' }} />
        <input className="nexus-input" placeholder="Search tenants..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 40 }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.map((t, i) => (
          <div key={t.name + i} className="nexus-card slide-up" style={{ animationDelay: `${i * 60}ms`, display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, var(--nexus-primary), var(--nexus-accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18, color: 'white', flexShrink: 0 }}>
              {t.name.charAt(0)}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 16 }}>{t.name}</div>
              <div style={{ display: 'flex', gap: 16, marginTop: 4, fontSize: 13, color: 'var(--nexus-text-secondary)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={13} /> {t.email}</span>
                {t.phone && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={13} /> {t.phone}</span>}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                {t.spaces.map(s => <span key={s} className="badge badge-neutral" style={{ fontSize: 11 }}>{s}</span>)}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: t.trust >= 800 ? 'var(--nexus-positive)' : 'var(--nexus-warning)' }}>
              <Shield size={16} />
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18 }}>{t.trust}</span>
            </div>

            <button className="btn-secondary" style={{ fontSize: 13 }}>View</button>
          </div>
        ))}
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
