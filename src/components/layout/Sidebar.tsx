'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import CopilotDrawer from '@/components/chat/CopilotDrawer';
import {
  LayoutDashboard,
  Building2,
  FileText,
  CreditCard,
  Wrench,
  Shield,
  Users,
  Mic,
  Layers,
  Sparkles,
  Menu,
  X as XIcon,
  Bell,
  Settings,
  LogOut,
} from 'lucide-react';
import { signOut } from '@/lib/actions/auth';

const ownerNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/spaces', label: 'Spaces', icon: Building2 },
  { href: '/leases', label: 'Leases', icon: FileText },
  { href: '/payments', label: 'Payments', icon: CreditCard },
  { href: '/maintenance', label: 'Maintenance', icon: Wrench },
  { href: '/tenants', label: 'Tenants', icon: Users },
  { href: '/trust', label: 'Trust Scores', icon: Shield },
  { href: '/micro-list', label: 'Micro-List', icon: Layers },
  { href: '/voice', label: 'Voice Agent', icon: Mic },
];

const tenantNav = [
  { href: '/dashboard', label: 'My Home', icon: LayoutDashboard },
  { href: '/leases', label: 'My Lease', icon: FileText },
  { href: '/payments', label: 'Rent Portal', icon: CreditCard },
  { href: '/maintenance', label: 'Service Requests', icon: Wrench },
];

const vendorNav = [
  { href: '/dashboard', label: 'Work Orders', icon: LayoutDashboard },
  { href: '/maintenance', label: 'Open Tickets', icon: Wrench },
  { href: '/payments', label: 'Payouts', icon: CreditCard },
];

const bottomItems = [
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Close sidebar on navigation in mobile
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const navItems = role === 'tenant' ? tenantNav : role === 'vendor' ? vendorNav : ownerNav;

  return (
    <>
      {/* Mobile Topbar */}
      <div className="mobile-topbar" style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 64,
        background: 'var(--nexus-bg-elevated)', borderBottom: '1px solid var(--nexus-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px',
        zIndex: 1500
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="sidebar-logo-icon" style={{ width: 32, height: 32, fontSize: 14 }}>N</div>
          <span className="sidebar-logo-text" style={{ fontSize: 18 }}>Rentova</span>
        </div>
        <button onClick={() => setIsMobileOpen(true)} className="btn-secondary" style={{ padding: 8 }}>
          <Menu size={20} />
        </button>
      </div>

      {/* Backdrop */}
      {isMobileOpen && (
        <div 
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1999, backdropFilter: 'blur(4px)' }}
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside className={`sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-logo" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="sidebar-logo-icon">N</div>
            <span className="sidebar-logo-text">Rentova</span>
          </div>
          {isMobileOpen && (
            <button onClick={() => setIsMobileOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--nexus-text-secondary)' }}>
              <XIcon size={20} />
            </button>
          )}
        </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
              id={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div style={{ borderTop: '1px solid var(--nexus-border)', paddingTop: 12, marginTop: 12 }}>
        {bottomItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
              id={`nav-${item.label.toLowerCase()}`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
        <button
          onClick={() => signOut()}
          className="sidebar-link"
          style={{ width: '100%', border: 'none', cursor: 'pointer', background: 'none' }}
          id="nav-logout"
        >
          <LogOut size={18} />
          Sign Out
        </button>

        <button
          onClick={() => setIsCopilotOpen(true)}
          style={{
            width: 'calc(100% - 24px)', margin: '12px 12px 0 12px', padding: '10px',
            border: 'none', borderRadius: 8, cursor: 'pointer',
            background: 'var(--nexus-accent)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontWeight: 600, fontSize: 13,
            boxShadow: '0 2px 8px rgba(0, 212, 170, 0.3)'
          }}
        >
          <Sparkles size={16} />
          Ask Rentova AI
        </button>
      </div>

      <CopilotDrawer role={role} isOpen={isCopilotOpen} onClose={() => setIsCopilotOpen(false)} />
    </aside>
    </>
  );
}
