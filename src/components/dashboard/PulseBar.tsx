'use client';

import { useEffect, useRef } from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import type { DashboardKPIs } from '@/types/database';
import { TrendingUp, DollarSign, AlertTriangle } from 'lucide-react';

interface PulseBarProps {
  kpis: DashboardKPIs;
}

export default function PulseBar({ kpis }: PulseBarProps) {
  const ringRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    if (ringRef.current) {
      const circumference = 2 * Math.PI * 50;
      const offset = circumference - (kpis.collectionRate / 100) * circumference;
      ringRef.current.style.strokeDashoffset = String(offset);
    }
  }, [kpis.collectionRate]);

  const trendData = kpis.cashFlowTrend.map((val, i) => ({ value: val, month: i }));
  const isPositive = kpis.totalCashFlow >= 0;

  return (
    <div className="grid-3" style={{ marginBottom: 32 }}>
      {/* Cash Flow Card */}
      <div className="kpi-card slide-up" style={{ animationDelay: '0ms' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="kpi-label">Total Cash Flow</div>
            <div className="kpi-value" style={{ color: isPositive ? 'var(--nexus-positive)' : 'var(--nexus-critical)' }}>
              ${kpis.totalCashFlow.toLocaleString()}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
              <TrendingUp size={14} style={{ color: 'var(--nexus-positive)' }} />
              <span style={{ color: 'var(--nexus-text-secondary)' }}>This month</span>
            </div>
          </div>
          <div style={{ width: 100, height: 50, minWidth: 100, minHeight: 50 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="cashGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34A853" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#34A853" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#34A853"
                  strokeWidth={2}
                  fill="url(#cashGradient)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Collection Rate Card */}
      <div className="kpi-card slide-up" style={{ animationDelay: '100ms' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="kpi-label">Collection Rate</div>
            <div className="kpi-value" style={{ color: kpis.collectionRate >= 90 ? 'var(--nexus-positive)' : kpis.collectionRate >= 70 ? 'var(--nexus-warning)' : 'var(--nexus-critical)' }}>
              {Math.round(kpis.collectionRate)}%
            </div>
            <div style={{ fontSize: 13, color: 'var(--nexus-text-secondary)' }}>
              <DollarSign size={14} style={{ display: 'inline', verticalAlign: -2 }} />
              {kpis.collectedPayments} of {kpis.totalPayments} collected
            </div>
          </div>
          <div className="collection-ring">
            <svg width="120" height="120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="var(--nexus-border)" strokeWidth="8" />
              <circle
                ref={ringRef}
                cx="60" cy="60" r="50"
                fill="none"
                stroke={kpis.collectionRate >= 90 ? 'var(--nexus-positive)' : kpis.collectionRate >= 70 ? 'var(--nexus-warning)' : 'var(--nexus-critical)'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={String(2 * Math.PI * 50)}
                strokeDashoffset={String(2 * Math.PI * 50)}
                style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)' }}
              />
            </svg>
            <div className="collection-ring-value">
              {Math.round(kpis.collectionRate)}%
            </div>
          </div>
        </div>
      </div>

      {/* Urgent Repairs Card */}
      <div className="kpi-card slide-up" style={{ animationDelay: '200ms' }}>
        <div className="kpi-label">Urgent Repairs</div>
        <div className="kpi-value" style={{
          display: 'flex', alignItems: 'center', gap: 12,
          color: kpis.criticalRepairs > 0 ? 'var(--nexus-critical)' : kpis.urgentRepairs > 0 ? 'var(--nexus-warning)' : 'var(--nexus-positive)'
        }}>
          {kpis.urgentRepairs}
          {kpis.criticalRepairs > 0 && (
            <span className="status-dot status-dot-critical" />
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--nexus-text-secondary)' }}>
          <AlertTriangle size={14} />
          {kpis.criticalRepairs > 0
            ? `${kpis.criticalRepairs} critical — immediate action needed`
            : kpis.urgentRepairs > 0
              ? 'Needs attention'
              : 'All clear'}
        </div>
      </div>
    </div>
  );
}
