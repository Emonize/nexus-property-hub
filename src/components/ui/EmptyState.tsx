import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '64px 20px',
      textAlign: 'center',
      borderRadius: 'var(--nexus-radius-lg)',
      background: 'var(--nexus-bg-elevated)',
      border: '1px solid var(--nexus-border)',
      boxShadow: 'inset 0 0 40px rgba(0, 0, 0, 0.2)'
    }} className="fade-in">
      <div style={{
        width: 80,
        height: 80,
        borderRadius: 24,
        background: 'rgba(108, 99, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        color: 'var(--nexus-primary-light)',
        border: '1px solid rgba(108, 99, 255, 0.15)',
        boxShadow: '0 0 30px rgba(108, 99, 255, 0.05)'
      }}>
        <Icon size={40} strokeWidth={1.5} />
      </div>
      
      <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: 'var(--nexus-text)' }}>
        {title}
      </h3>
      
      <p style={{ maxWidth: 400, color: 'var(--nexus-text-secondary)', fontSize: 14, marginBottom: actionLabel ? 24 : 0, lineHeight: 1.6 }}>
        {description}
      </p>

      {actionLabel && onAction && (
        <button className="btn-primary slide-up" onClick={onAction}>
          <Icon size={16} />
          {actionLabel}
        </button>
      )}
    </div>
  );
}
