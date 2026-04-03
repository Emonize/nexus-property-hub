'use client';

import { useState, useEffect, useCallback } from 'react';
import { User, CreditCard, Bell, Shield } from 'lucide-react';
import { deleteAccount } from '@/lib/actions/auth';

interface UserProfile {
  full_name: string;
  email: string;
  phone: string;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile>({
    full_name: '',
    email: '',
    phone: '',
  });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

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
          });
        }
      }
    } catch {
      // Keep default
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      if (res.ok) {
        setSaveMsg('Profile updated successfully!');
      } else {
        setSaveMsg('Failed to save changes.');
      }
    } catch {
      setSaveMsg('Network error. Try again.');
    }
    setSaving(false);
    setTimeout(() => setSaveMsg(''), 3000);
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm("Are you absolutely sure you want to delete your Nexus Property Hub account? This action cannot be undone and will erase all your data.");
    if (!confirmed) return;

    try {
      const result = await deleteAccount();
      if (result.error) {
        alert("Deletion failed: " + result.error);
        return;
      }
      // Redirect to login 
      window.location.href = '/auth/login';
    } catch (e: any) {
      alert("System err: " + e.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your account and preferences</p>
        </div>
      </div>

      <div className="grid-2">
        {/* Profile */}
        <div className="nexus-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <User size={20} style={{ color: 'var(--nexus-primary-light)' }} />
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Profile</h3>
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
                style={{ alignSelf: 'flex-start' }}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              {saveMsg && (
                <span style={{ fontSize: 13, color: saveMsg.includes('success') ? 'var(--nexus-positive)' : 'var(--nexus-critical)' }}>
                  {saveMsg}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Payment Settings */}
        <div className="nexus-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <CreditCard size={20} style={{ color: 'var(--nexus-accent)' }} />
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Payment Settings</h3>
          </div>
          <div style={{ padding: '20px', background: 'rgba(0, 212, 170, 0.06)', borderRadius: 'var(--nexus-radius-sm)', border: '1px solid rgba(0, 212, 170, 0.15)', marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: 'var(--nexus-accent)', fontWeight: 600 }}>Stripe Connect</div>
            <div style={{ fontSize: 14, marginTop: 4 }}>Connected Account: <strong>acct_1234...xyz</strong></div>
            <div style={{ fontSize: 12, color: 'var(--nexus-text-muted)', marginTop: 4 }}>Payouts are automatically deposited to your bank account</div>
          </div>
          <button className="btn-secondary" style={{ width: '100%' }}>Update Stripe Settings</button>
        </div>

        {/* Notification Preferences */}
        <div className="nexus-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <Bell size={20} style={{ color: 'var(--nexus-warning)' }} />
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Notifications</h3>
          </div>
          {['Payment Reminders', 'Maintenance Updates', 'Lease Actions', 'Trust Score Changes'].map(name => (
            <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--nexus-border)' }}>
              <span style={{ fontSize: 14 }}>{name}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                {['Email', 'SMS', 'Push'].map(ch => (
                  <label key={ch} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--nexus-text-secondary)', cursor: 'pointer' }}>
                    <input type="checkbox" defaultChecked={ch !== 'SMS'} />
                    {ch}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Security */}
        <div className="nexus-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <Shield size={20} style={{ color: 'var(--nexus-critical)' }} />
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Security</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button className="btn-secondary" style={{ justifyContent: 'flex-start' }}>Change Password</button>
            <button className="btn-secondary" style={{ justifyContent: 'flex-start' }}>Enable Two-Factor Auth</button>
            <button className="btn-danger" style={{ justifyContent: 'flex-start' }} onClick={handleDeleteAccount}>Delete Account</button>
          </div>
        </div>
      </div>
    </div>
  );
}
