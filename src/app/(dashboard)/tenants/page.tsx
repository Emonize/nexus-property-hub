'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Plus, Mail, Phone, Shield, Users } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { Virtuoso } from 'react-virtuoso';
import { getTenants, inviteTenant } from '@/lib/actions/tenants';
import toast from 'react-hot-toast';

// ─── Invite Tenant Modal ───────────────────────────────────────────────────────
function InviteTenantModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim() || !formData.email.trim()) {
      toast.error('Name and Email are required.');
      return;
    }

    setLoading(true);
    try {
      const result = await inviteTenant(formData);
      setLoading(false);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Invitation sent to ${formData.email}!`);
        onSuccess();
        onClose();
      }
    } catch {
      setLoading(false);
      toast.error('An unexpected error occurred.');
    }
  };

  return (
    <div className="modal-overlay slide-up">
      <div className="modal-content fade-in" style={{ maxWidth: 500 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>Invite a Tenant</h2>
            <p style={{ fontSize: 13, color: 'var(--nexus-text-muted)', marginTop: 4 }}>
              They will receive an email link to set up their account and view their lease.
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--nexus-text-muted)' }}>
            <Plus size={24} style={{ transform: 'rotate(45deg)' }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="nexus-label">Full Name *</label>
            <input
              required
              type="text"
              className="nexus-input"
              placeholder="e.g. John Doe"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            />
          </div>

          <div>
            <label className="nexus-label">Email Address *</label>
            <input
              required
              type="email"
              className="nexus-input"
              placeholder="tenant@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div>
            <label className="nexus-label">Phone Number (Optional)</label>
            <input
              type="tel"
              className="nexus-input"
              placeholder="(555) 123-4567"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Sending Invite...' : 'Send Invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

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
  const [showInviteModal, setShowInviteModal] = useState(false);

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
        <button className="btn-primary" aria-label="Invite new tenant" onClick={() => setShowInviteModal(true)}>
          <Plus size={16} /> Invite Tenant
        </button>
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

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteTenantModal
          onClose={() => setShowInviteModal(false)}
          onSuccess={fetchTenants}
        />
      )}
    </div>
  );
}
