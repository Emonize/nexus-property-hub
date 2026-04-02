'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, Check, Clock, Wrench, DollarSign, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface NotifRow {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
}

const demoNotifications: NotifRow[] = [
  { id: '1', type: 'payment_reminder', title: 'Rent payment received', body: 'Alex Rivera paid $1,200 for Bedroom 1', read: false, created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: '2', type: 'maintenance_update', title: 'Maintenance ticket triaged', body: 'Leaking kitchen faucet assessed as high severity — $280 estimate', read: false, created_at: new Date(Date.now() - 7200000).toISOString() },
  { id: '3', type: 'lease_action', title: 'New lease application', body: 'Jamie Wilson applied for Unit 3C', read: true, created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: '4', type: 'trust_update', title: 'Trust score updated', body: "Priya Sharma's score decreased to 680 — background check flagged", read: true, created_at: new Date(Date.now() - 172800000).toISOString() },
];

const typeIcons: Record<string, typeof DollarSign> = {
  payment_reminder: DollarSign,
  maintenance_update: Wrench,
  lease_action: FileText,
  trust_update: Check,
  system: Bell,
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotifRow[]>(demoNotifications);
  const [isLive, setIsLive] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        if (data?.data && data.data.length > 0) {
          setNotifications(data.data.map((n: Record<string, unknown>) => ({
            id: n.id,
            type: n.type || 'system',
            title: n.title || '',
            body: n.body || '',
            read: !!n.read,
            created_at: n.created_at as string,
          })));
          setIsLive(true);
        }
      }
    } catch {
      // Keep demo data
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">
            {unreadCount} unread
            {!isLive && (
              <span style={{ marginLeft: 12, padding: '2px 8px', borderRadius: 6, background: 'rgba(251, 188, 4, 0.15)', color: 'var(--nexus-warning)', fontSize: 11, fontWeight: 600 }}>
                DEMO MODE
              </span>
            )}
          </p>
        </div>
        <button className="btn-secondary">Mark all read</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {notifications.map((notif, i) => {
          const Icon = typeIcons[notif.type] || Bell;
          return (
            <div key={notif.id} className="action-card slide-up" style={{
              animationDelay: `${i * 50}ms`,
              background: notif.read ? 'var(--nexus-bg-card)' : 'rgba(108, 99, 255, 0.04)',
              borderColor: notif.read ? 'var(--nexus-border)' : 'rgba(108, 99, 255, 0.15)',
            }}>
              <div className="action-icon" style={{ background: 'rgba(108, 99, 255, 0.1)', color: 'var(--nexus-primary-light)' }}>
                <Icon size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: notif.read ? 500 : 600, fontSize: 14 }}>{notif.title}</div>
                <div style={{ fontSize: 13, color: 'var(--nexus-text-secondary)', marginTop: 2 }}>{notif.body}</div>
                <div style={{ fontSize: 12, color: 'var(--nexus-text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={12} />
                  {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                </div>
              </div>
              {!notif.read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--nexus-primary)', flexShrink: 0 }} />}
            </div>
          );
        })}
        {notifications.length === 0 && (
          <div className="nexus-card" style={{ padding: 40, textAlign: 'center', color: 'var(--nexus-text-muted)' }}>
            No notifications
          </div>
        )}
      </div>
    </div>
  );
}
