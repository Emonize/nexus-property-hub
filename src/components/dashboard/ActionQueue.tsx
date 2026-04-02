'use client';

import { Wrench, DollarSign, FileText, ChevronRight, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActionItem {
  id: string;
  type: 'maintenance' | 'payment' | 'lease';
  title: string;
  subtitle: string;
  timestamp: string;
  severity?: string;
  cta: string;
  amount?: number;
}

interface ActionQueueProps {
  items: ActionItem[];
  onApprove: (id: string, type: string) => void;
  onSnooze: (id: string) => void;
}

const iconMap = {
  maintenance: { Icon: Wrench, className: 'action-icon-maintenance' },
  payment: { Icon: DollarSign, className: 'action-icon-payment' },
  lease: { Icon: FileText, className: 'action-icon-lease' },
};

export default function ActionQueue({ items, onApprove, onSnooze }: ActionQueueProps) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Action Queue</h2>
          <p style={{ fontSize: 13, color: 'var(--nexus-text-secondary)', marginTop: 4 }}>
            Items requiring your attention, sorted by urgency
          </p>
        </div>
        <span className="badge badge-neutral">{items.length} items</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '48px 24px',
            background: 'var(--nexus-bg-card)',
            borderRadius: 'var(--nexus-radius-lg)',
            border: '1px solid var(--nexus-border)',
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✨</div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>All caught up!</div>
            <div style={{ color: 'var(--nexus-text-muted)', fontSize: 14, marginTop: 4 }}>No pending actions</div>
          </div>
        ) : (
          items.map((item, index) => {
            const { Icon, className } = iconMap[item.type];
            return (
              <div
                key={item.id}
                className="action-card slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className={`action-icon ${className}`}>
                  <Icon size={20} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {item.title}
                    {item.severity && (
                      <span className={`badge ${
                        item.severity === 'critical' ? 'badge-critical' :
                        item.severity === 'high' ? 'badge-warning' :
                        'badge-neutral'
                      }`}>
                        {item.severity}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--nexus-text-secondary)', marginTop: 2 }}>
                    {item.subtitle}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--nexus-text-muted)', marginTop: 4 }}>
                    <Clock size={12} />
                    {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                  </div>
                </div>

                {item.amount && (
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, whiteSpace: 'nowrap' }}>
                    ${item.amount}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button
                    className="btn-primary"
                    style={{ padding: '8px 16px', fontSize: 12 }}
                    onClick={() => onApprove(item.id, item.type)}
                  >
                    {item.cta}
                  </button>
                  <button
                    className="btn-secondary"
                    style={{ padding: '8px 12px', fontSize: 12 }}
                    onClick={() => onSnooze(item.id)}
                  >
                    Snooze
                  </button>
                </div>

                <ChevronRight size={16} style={{ color: 'var(--nexus-text-muted)', flexShrink: 0 }} />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
