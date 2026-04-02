'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service like Sentry or LogRocket in production
    console.error('Dashboard Chunk Error:', error);
  }, [error]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      textAlign: 'center',
      padding: 40,
    }}>
      <div style={{
        width: 80,
        height: 80,
        borderRadius: '50%',
        background: 'rgba(234, 67, 53, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
      }}>
        <AlertCircle size={40} style={{ color: 'var(--nexus-critical)' }} />
      </div>
      
      <h2 style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-display)', marginBottom: 12 }}>
        Application Error
      </h2>
      
      <p style={{ color: 'var(--nexus-text-secondary)', maxWidth: 400, marginBottom: 32, lineHeight: 1.6 }}>
        We encountered an unexpected error while trying to load this view. The administrative server may be temporarily unreachable.
      </p>

      <div style={{ display: 'flex', gap: 16 }}>
        <button
          onClick={() => window.location.href = '/dashboard'}
          className="btn-secondary"
        >
          Return to Dashboard
        </button>
        <button
          onClick={() => reset()}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <RefreshCw size={16} />
          Try Again
        </button>
      </div>

      {process.env.NODE_ENV === 'development' && (
        <div style={{
          marginTop: 40,
          padding: 20,
          background: 'rgba(0,0,0,0.03)',
          borderRadius: 8,
          textAlign: 'left',
          maxWidth: 600,
          width: '100%',
          overflow: 'auto',
          fontSize: 13,
          fontFamily: 'monospace',
          border: '1px solid var(--nexus-border)'
        }}>
          <strong style={{ color: 'var(--nexus-critical)' }}>Developer Stack Trace:</strong><br />
          {error.message}
        </div>
      )}
    </div>
  );
}
