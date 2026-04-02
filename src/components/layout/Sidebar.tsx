'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import CopilotDrawer from '@/components/chat/CopilotDrawer';
import {
  LayoutDashboard,
  Building2,
  FileText,
  CreditCard,
  Wrench,
  Shield,
  Bell,
  Settings,
  LogOut,
  Users,
  Mic,
  Layers,
  Sparkles,
} from 'lucide-react';
import { signOut } from '@/lib/actions/auth';

const navItems = [
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

const bottomItems = [
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">N</div>
        <span className="sidebar-logo-text">Rentova</span>
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

      <CopilotDrawer isOpen={isCopilotOpen} onClose={() => setIsCopilotOpen(false)} />
    </aside>
  );
}
