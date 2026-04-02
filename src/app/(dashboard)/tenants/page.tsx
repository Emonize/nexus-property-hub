'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Mail, Phone, Shield } from 'lucide-react';

interface TenantRow {
  name: string;
  email: string;
  phone: string;
  spaces: string[];
  trust: number;
  status: string;
}

const demoTenants: TenantRow[] = [
  { name: 'Alex Rivera', email: 'tenant1@nexus.test', phone: '+1 (555) 123-4567', spaces: ['Bedroom 1', 'Unit 2B'], trust: 820, status: 'active' },
  { name: 'Jordan Park', email: 'tenant2@nexus.test', phone: '+1 (555) 234-5678', spaces: ['Bedroom 2'], trust: 760, status: 'active' },
  { name: 'Priya Sharma', email: 'tenant3@nexus.test', phone: '+1 (555) 345-6789', spaces: ['Bedroom 3'], trust: 680, status: 'active' },
];

export default function TenantsPage() {
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [search, setSearch] = useState('');

  const fetchTenants = useCallback(async () => {
    try {
      const res = await fetch('/api/tenants');
      if (res.ok) {
        const data = await res.json();
        if (data?.data && data.data.length > 0) {
          const mapped: TenantRow[] = data.data.map((t: Record<string, unknown>) => ({
            name: t.full_name || 'Unknown',
            email: t.email || '',
            phone: t.phone || '',
            spaces: Array.isArray(t.leases) ? (t.leases as Record<string, unknown>[]).filter((l: Record<string, unknown>) => l.status === 'active').map((l: Record<string, unknown>) => (l.space as Record<string, unknown>)?.name || 'Unknown') : [],
            trust: Array.isArray(t.trust) && (t.trust as Record<string, unknown>[]).length > 0 ? Number((t.trust as Record<string, unknown>[])[0].score) : 0,
            status: 'active',
          }));
          setTenants(mapped);
          setIsLive(true);
        }
      }
    } catch {
      // Keep demo data
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
            {!isLive && (
              <span style={{ marginLeft: 12, padding: '2px 8px', borderRadius: 6, background: 'rgba(251, 188, 4, 0.15)', color: 'var(--nexus-warning)', fontSize: 11, fontWeight: 600 }}>
                DEMO MODE
              </span>
            )}
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
          <div className="nexus-card" style={{ padding: 40, textAlign: 'center', color: 'var(--nexus-text-muted)' }}>
            No tenants found
          </div>
        )}
      </div>
    </div>
  );
}
