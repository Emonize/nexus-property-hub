'use client';

import { useState, useEffect, useCallback } from 'react';
import { User, CreditCard, Bell, Shield, ExternalLink, LogOut, CheckCircle } from 'lucide-react';
import { deleteAccount, signOut } from '@/lib/actions/auth';

interface UserProfile {
  full_name: string;
  email: string;
  phone: string;
  role: string;
  stripe_status: 'not_connected' | 'pending' | 'active';
  stripe_connect_id: string | null;
  stripe_customer_id: string | null;
  subscription_plan: string;
  subscription_status: string;
}

interface NotificationPrefs {
  payment_reminder: { email: boolean; sms: boolean; push: boolean };
  maintenance_update: { email: boolean; sms: boolean; push: boolean };
  lease_action: { email: boolean; sms: boolean; push: boolean };
  trust_update: { email: boolean; sms: boolean; push: boolean };
}

const defaultPrefs: NotificationPrefs = {
  payment_reminder: { email: true, sms: false, push: true },
  maintenance_update: { email: true, sms: false, push: true },
  lease_action: { email: true, sms: true, push: true },
  trust_update: { email: true, sms: false, push: false },
};

const notifLabels: Record<keyof NotificationPrefs, string> = {
  payment_reminder: 'Payment Reminders',
  maintenance_update: 'Maintenance Updates',
  lease_action: 'Lease Actions',
  trust_update: 'Trust Score Changes',
};

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile>({
    full_name: '',
    email: '',
    phone: '',
    role: 'owner',
    stripe_status: 'not_connected',
    stripe_connect_id: null,
    stripe_customer_id: null,
    subscription_plan: 'starter',
    subscription_status: 'active',
  });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>(defaultPrefs);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/user/profile');
      if (res.ok) {
        const data = await res.json();
        if (data?.data) {
          setProfile({
            full_name: data.data.full_name || '',
            email: data.data.email || '',
            phone: data.data.phone || '',
            role: data.data.role || 'owner',
            stripe_status: data.data.stripe_connect_id ? 'active' : 'not_connected',
            stripe_connect_id: data.data.stripe_connect_id || null,
            stripe_customer_id: data.data.stripe_customer_id || null,
            subscription_plan: data.data.subscription_plan || 'starter',
            subscription_status: data.data.subscription_status || 'active',
          });
        }
      }
    } catch {
      // Keep defaults
    }

    // Load saved notification preferences from localStorage
    const saved = localStorage.getItem('nexus_notif_prefs');
    if (saved) {
      try { setNotifPrefs(JSON.parse(saved)); } catch { /* keep defaults */ }
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProfile();
  }, [fetchProfile]);

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: profile.full_name, phone: profile.phone }),
      });
      setSaveMsg(res.ok ? 'Profile updated successfully!' : 'Failed to save changes.');
    } catch {
      setSaveMsg('Network error. Try again.');
    }
    setSaving(false);
    setTimeout(() => setSaveMsg(''), 3000);
  };

  const handleStripeConnect = async () => {
    setStripeLoading(true);
    try {
      const res = await fetch('/api/stripe/connect', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to start Stripe onboarding');
      }
    } catch {
      alert('Unable to connect to Stripe');
    }
    setStripeLoading(false);
  };

  const handleManageSubscription = async () => {
    if (profile.subscription_plan === 'starter' || !profile.stripe_customer_id) {
      window.location.href = '/pricing';
      return;
    }
    setPortalLoading(true);
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to open billing portal');
      }
    } catch {
      alert('Unable to connect to Stripe portal');
    }
    setPortalLoading(false);
  };

  const handleNotifChange = (
    type: keyof NotificationPrefs,
    channel: 'email' | 'sms' | 'push',
    value: boolean
  ) => {
    const updated = {
      ...notifPrefs,
      [type]: { ...notifPrefs[type], [channel]: value },
    };
    setNotifPrefs(updated);
    localStorage.setItem('nexus_notif_prefs', JSON.stringify(updated));
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Are you absolutely sure you want to delete your account? This action cannot be undone and will erase all your data.'
    );
    if (!confirmed) return;

    try {
      const result = await deleteAccount();
      if (result.error) {
        alert('Deletion failed: ' + result.error);
        return;
      }
      window.location.href = '/auth/login';
    } catch (e: Error | unknown) {
      alert('Error: ' + (e instanceof Error ? e.message : 'Unknown error'));
    }
  };

  const isOwnerOrManager = profile.role === 'owner' || profile.role === 'manager';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your account and preferences</p>
        </div>
      </div>

      <div className="grid-2">
        {/* ─── Profile ─────────────────────────── */}
        <div className="nexus-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <User size={20} style={{ color: 'var(--nexus-primary-light)' }} />
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Profile</h3>
            <span className="badge badge-neutral" style={{ marginLeft: 'auto' }}>{profile.role}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="nexus-label">Full Name</label>
              <input
                className="nexus-input"
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                placeholder="Your full name"
              />
            </div>
            <div>
              <label className="nexus-label">Email</label>
              <input
                className="nexus-input"
                value={profile.email}
                type="email"
                disabled
                style={{ opacity: 0.6, cursor: 'not-allowed' }}
              />
              <div style={{ fontSize: 11, color: 'var(--nexus-text-muted)', marginTop: 4 }}>
                Email cannot be changed. Contact support if needed.
              </div>
            </div>
            <div>
              <label className="nexus-label">Phone</label>
              <input
                className="nexus-input"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                placeholder="+1 (555) 000-0000"
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                className="btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              {saveMsg && (
                <span style={{
                  fontSize: 13,
                  color: saveMsg.includes('success') ? 'var(--nexus-positive)' : 'var(--nexus-critical)',
                }}>
                  {saveMsg}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ─── Payment Settings ────────────────── */}
        <div className="nexus-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <CreditCard size={20} style={{ color: 'var(--nexus-accent)' }} />
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Payment Settings</h3>
          </div>

          {isOwnerOrManager ? (
            <>
              {/* Stripe Connect for owners/managers */}
              <div style={{
                padding: 20,
                background: profile.stripe_connect_id
                  ? 'rgba(52, 168, 83, 0.06)'
                  : 'rgba(0, 212, 170, 0.06)',
                borderRadius: 'var(--nexus-radius-sm)',
                border: `1px solid ${profile.stripe_connect_id
                  ? 'rgba(52, 168, 83, 0.15)'
                  : 'rgba(0, 212, 170, 0.15)'}`,
                marginBottom: 16,
              }}>
                {profile.stripe_connect_id ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CheckCircle size={16} style={{ color: 'var(--nexus-positive)' }} />
                      <span style={{ fontSize: 13, color: 'var(--nexus-positive)', fontWeight: 600 }}>
                        Stripe Connected
                      </span>
                    </div>
                    <div style={{ fontSize: 14, marginTop: 8 }}>
                      Account: <strong>{profile.stripe_connect_id.slice(0, 12)}...</strong>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--nexus-text-muted)', marginTop: 4 }}>
                      Payouts are automatically deposited to your bank account
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>Connect Stripe to receive payouts</div>
                    <div style={{ fontSize: 13, color: 'var(--nexus-text-secondary)', marginTop: 4 }}>
                      Set up your Stripe Connected Account to receive rent payments from tenants.
                    </div>
                  </>
                )}
              </div>
              <button
                className={profile.stripe_connect_id ? 'btn-secondary' : 'btn-primary'}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                onClick={handleStripeConnect}
                disabled={stripeLoading}
              >
                {stripeLoading ? 'Connecting...' : (
                  <>
                    <ExternalLink size={14} />
                    {profile.stripe_connect_id ? 'Manage Stripe Account' : 'Connect Stripe'}
                  </>
                )}
              </button>

              {/* Subscription Billing Info */}
              <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--nexus-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 600 }}>Subscription Plan</h4>
                  <span className={`badge ${profile.subscription_plan === 'starter' ? 'badge-neutral' : 'badge-gold'}`} style={{ textTransform: 'capitalize' }}>
                    {profile.subscription_plan}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--nexus-text-secondary)', marginBottom: 16 }}>
                  Status: <strong style={{ color: profile.subscription_status === 'active' || profile.subscription_status === 'trialing' ? 'var(--nexus-positive)' : 'var(--nexus-warning)', textTransform: 'capitalize' }}>{profile.subscription_status}</strong>
                </div>
                <button
                  className="btn-secondary"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  onClick={handleManageSubscription}
                  disabled={portalLoading}
                >
                  {portalLoading ? 'Loading...' : (profile.subscription_plan === 'starter' ? 'Upgrade Plan' : 'Manage Subscription')}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Payment method info for tenants/vendors */}
              <div style={{
                padding: 20,
                background: profile.stripe_customer_id
                  ? 'rgba(52, 168, 83, 0.06)'
                  : 'rgba(251, 188, 4, 0.06)',
                borderRadius: 'var(--nexus-radius-sm)',
                border: `1px solid ${profile.stripe_customer_id
                  ? 'rgba(52, 168, 83, 0.15)'
                  : 'rgba(251, 188, 4, 0.15)'}`,
                marginBottom: 16,
              }}>
                {profile.stripe_customer_id ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CheckCircle size={16} style={{ color: 'var(--nexus-positive)' }} />
                      <span style={{ fontSize: 13, color: 'var(--nexus-positive)', fontWeight: 600 }}>
                        Payment Method Saved
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--nexus-text-muted)', marginTop: 4 }}>
                      Your card is on file for automatic rent payments
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--nexus-warning)' }}>
                      No Payment Method
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--nexus-text-secondary)', marginTop: 4 }}>
                      Add a payment method to enable automatic rent payments
                    </div>
                  </>
                )}
              </div>
              <button
                className="btn-secondary"
                style={{ width: '100%' }}
                onClick={() => window.location.href = '/onboarding?step=payment'}
              >
                {profile.stripe_customer_id ? 'Update Payment Method' : 'Add Payment Method'}
              </button>
            </>
          )}
        </div>

        {/* ─── Notification Preferences ────────── */}
        <div className="nexus-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <Bell size={20} style={{ color: 'var(--nexus-warning)' }} />
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Notifications</h3>
          </div>
          {(Object.keys(notifLabels) as (keyof NotificationPrefs)[]).map(type => (
            <div
              key={type}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 0',
                borderBottom: '1px solid var(--nexus-border)',
              }}
            >
              <span style={{ fontSize: 14 }}>{notifLabels[type]}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['email', 'sms', 'push'] as const).map(ch => (
                  <label
                    key={ch}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      fontSize: 12, color: 'var(--nexus-text-secondary)', cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={notifPrefs[type][ch]}
                      onChange={(e) => handleNotifChange(type, ch, e.target.checked)}
                    />
                    {ch.charAt(0).toUpperCase() + ch.slice(1)}
                  </label>
                ))}
              </div>
            </div>
          ))}
          <div style={{ fontSize: 11, color: 'var(--nexus-text-muted)', marginTop: 12 }}>
            SMS notifications require a verified phone number. Push requires browser permissions.
          </div>
        </div>

        {/* ─── Security ────────────────────────── */}
        <div className="nexus-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <Shield size={20} style={{ color: 'var(--nexus-critical)' }} />
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Security</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button
              className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              onClick={() => signOut()}
            >
              <LogOut size={14} /> Sign Out
            </button>
            <div style={{
              borderTop: '1px solid var(--nexus-border)',
              paddingTop: 16, marginTop: 4,
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--nexus-critical)', marginBottom: 8 }}>
                Danger Zone
              </div>
              <button
                className="btn-secondary"
                style={{
                  color: 'var(--nexus-critical)',
                  borderColor: 'rgba(234, 67, 53, 0.3)',
                  width: '100%',
                }}
                onClick={handleDeleteAccount}
              >
                Delete Account
              </button>
              <div style={{ fontSize: 11, color: 'var(--nexus-text-muted)', marginTop: 8 }}>
                Permanently deletes your account and all associated data. This cannot be undone.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
