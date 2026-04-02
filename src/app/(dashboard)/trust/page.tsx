'use client';

import { useState, useEffect, useCallback } from 'react';
import { Shield } from 'lucide-react';

interface TrustRow {
  user: string;
  score: number;
  payment: number;
  bg: string;
  credit: number;
  evictions: number;
  review: number;
}

const demoScores: TrustRow[] = [
  { user: 'Alex Rivera', score: 820, payment: 95, bg: 'clear', credit: 740, evictions: 0, review: 4.5 },
  { user: 'Jordan Park', score: 760, payment: 88, bg: 'clear', credit: 690, evictions: 0, review: 4.2 },
  { user: 'Priya Sharma', score: 680, payment: 72, bg: 'flagged', credit: 620, evictions: 1, review: 3.8 },
];

function getScoreColor(score: number) {
  if (score >= 800) return 'var(--nexus-positive)';
  if (score >= 600) return 'var(--nexus-warning)';
  return 'var(--nexus-critical)';
}

function getScoreLabel(score: number) {
  if (score >= 800) return 'Excellent';
  if (score >= 600) return 'Good';
  if (score >= 400) return 'Fair';
  return 'At Risk';
}

export default function TrustPage() {
  const [scores, setScores] = useState<TrustRow[]>(demoScores);
  const [isLive, setIsLive] = useState(false);

  const fetchScores = useCallback(async () => {
    try {
      const res = await fetch('/api/trust');
      if (res.ok) {
        const data = await res.json();
        if (data?.data && data.data.length > 0) {
          const mapped: TrustRow[] = data.data.map((t: Record<string, unknown>) => ({
            user: (t.user as Record<string, unknown>)?.full_name || 'Unknown',
            score: Number(t.score) || 0,
            payment: 0, // computed client-side from payment data
            bg: t.bg_check_status || 'pending',
            credit: Number(t.credit_score) || 0,
            evictions: Number(t.eviction_count) || 0,
            review: Number(t.review_avg) || 0,
          }));
          setScores(mapped);
          setIsLive(true);
        }
      }
    } catch {
      // Keep demo data
    }
  }, []);

  useEffect(() => {
    fetchScores();
  }, [fetchScores]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Trust Scores</h1>
          <p className="page-subtitle">
            AI-computed tenant reliability scores (0–1000)
            {!isLive && (
              <span style={{ marginLeft: 12, padding: '2px 8px', borderRadius: 6, background: 'rgba(251, 188, 4, 0.15)', color: 'var(--nexus-warning)', fontSize: 11, fontWeight: 600 }}>
                DEMO MODE
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Score Breakdown Legend */}
      <div className="nexus-card" style={{ marginBottom: 24, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'Payment History', weight: '35%', color: 'var(--nexus-primary-light)' },
          { label: 'Background Check', weight: '25%', color: 'var(--nexus-accent)' },
          { label: 'Credit Score', weight: '20%', color: 'var(--nexus-info)' },
          { label: 'Eviction History', weight: '10%', color: 'var(--nexus-warning)' },
          { label: 'Peer Reviews', weight: '10%', color: 'var(--nexus-positive)' },
        ].map(f => (
          <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: f.color }} />
            <span style={{ color: 'var(--nexus-text-secondary)' }}>{f.label}</span>
            <span style={{ fontWeight: 700, color: f.color }}>{f.weight}</span>
          </div>
        ))}
      </div>

      {/* Score Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {scores.map((t, i) => (
          <div key={t.user + i} className="nexus-card slide-up" style={{ animationDelay: `${i * 80}ms` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              {/* Score Ring */}
              <div style={{ position: 'relative', width: 90, height: 90, flexShrink: 0 }}>
                <svg width="90" height="90" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="45" cy="45" r="38" fill="none" stroke="var(--nexus-border)" strokeWidth="6" />
                  <circle cx="45" cy="45" r="38" fill="none" stroke={getScoreColor(t.score)} strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 38}`}
                    strokeDashoffset={`${2 * Math.PI * 38 * (1 - t.score / 1000)}`}
                    style={{ transition: 'stroke-dashoffset 1s ease' }} />
                </svg>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: getScoreColor(t.score) }}>{t.score}</div>
                </div>
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 18 }}>{t.user}</span>
                  <span className={`badge ${t.score >= 800 ? 'badge-positive' : t.score >= 600 ? 'badge-warning' : 'badge-critical'}`}>
                    {getScoreLabel(t.score)}
                  </span>
                </div>

                <div className="grid-4" style={{ marginTop: 12, gap: 12 }}>
                  {[
                    { label: 'Payment', value: `${t.payment}%`, color: 'var(--nexus-primary-light)' },
                    { label: 'Background', value: t.bg, color: t.bg === 'clear' ? 'var(--nexus-positive)' : 'var(--nexus-warning)' },
                    { label: 'Credit', value: t.credit, color: t.credit >= 700 ? 'var(--nexus-positive)' : 'var(--nexus-warning)' },
                    { label: 'Reviews', value: `${t.review}/5`, color: 'var(--nexus-accent)' },
                  ].map(f => (
                    <div key={f.label}>
                      <div style={{ fontSize: 11, color: 'var(--nexus-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{f.label}</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: f.color, marginTop: 2, fontFamily: 'var(--font-display)' }}>{f.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <button className="btn-secondary" style={{ fontSize: 13 }}>Recompute</button>
            </div>
          </div>
        ))}
        {scores.length === 0 && (
          <div className="nexus-card" style={{ padding: 40, textAlign: 'center', color: 'var(--nexus-text-muted)' }}>
            No trust scores found
          </div>
        )}
      </div>
    </div>
  );
}
