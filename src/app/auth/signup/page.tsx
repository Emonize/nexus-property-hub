'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signUp } from '@/lib/actions/auth';

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'tenant' as 'owner' | 'tenant' | 'manager' | 'vendor',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await signUp(formData);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push('/dashboard');
    }
  };

  const roles = [
    { value: 'owner', label: 'Property Owner', desc: 'Manage properties & tenants' },
    { value: 'tenant', label: 'Tenant', desc: 'Pay rent & submit requests' },
    { value: 'manager', label: 'Property Manager', desc: 'Manage on behalf of owners' },
    { value: 'vendor', label: 'Service Vendor', desc: 'Handle maintenance jobs' },
  ];

  return (
    <div className="auth-container">
      <div className="auth-card fade-in">
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div className="sidebar-logo-icon" style={{ width: 48, height: 48, fontSize: 20, margin: '0 auto 16px', borderRadius: 14 }}>N</div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Create your account</h1>
          <p style={{ color: 'var(--nexus-text-secondary)', marginTop: 8, fontSize: 14 }}>
            Join Nexus Property Hub
          </p>
        </div>

        {error && (
          <div style={{
            padding: '12px 16px',
            background: 'rgba(234, 67, 53, 0.1)',
            border: '1px solid rgba(234, 67, 53, 0.3)',
            borderRadius: 'var(--nexus-radius-sm)',
            color: 'var(--nexus-critical)',
            fontSize: 13,
            marginBottom: 20,
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label className="nexus-label" htmlFor="signup-name">Full Name</label>
            <input
              id="signup-name"
              className="nexus-input"
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="Your full name"
              required
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label className="nexus-label" htmlFor="signup-email">Email</label>
            <input
              id="signup-email"
              className="nexus-input"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="you@email.com"
              required
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label className="nexus-label" htmlFor="signup-password">Password</label>
            <input
              id="signup-password"
              className="nexus-input"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Minimum 8 characters"
              minLength={8}
              required
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label className="nexus-label">I am a...</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {roles.map((role) => (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, role: role.value as typeof formData.role })}
                  style={{
                    padding: '12px',
                    background: formData.role === role.value
                      ? 'rgba(108, 99, 255, 0.1)'
                      : 'var(--nexus-bg-elevated)',
                    border: `1px solid ${formData.role === role.value
                      ? 'var(--nexus-primary)'
                      : 'var(--nexus-border)'}`,
                    borderRadius: 'var(--nexus-radius-sm)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: 'var(--nexus-text)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{role.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--nexus-text-muted)', marginTop: 2 }}>{role.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '14px 24px' }}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'var(--nexus-text-secondary)' }}>
          Already have an account?{' '}
          <Link href="/auth/login" style={{ color: 'var(--nexus-primary-light)', textDecoration: 'none', fontWeight: 600 }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
