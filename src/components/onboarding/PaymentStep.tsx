'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

interface PaymentStepProps {
  onComplete: () => void;
}

function PaymentForm({ onComplete }: { onComplete: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    const { error: submitError } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/onboarding?step=payment&status=success`,
      },
      redirect: 'if_required',
    });

    if (submitError) {
      setError(submitError.message || 'Something went wrong.');
      setProcessing(false);
    } else {
      setSucceeded(true);
      setProcessing(false);
      onComplete();
    }
  };

  if (succeeded) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: 32, gap: 12,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: 'rgba(52, 168, 83, 0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <CheckCircle size={24} style={{ color: 'var(--nexus-positive)' }} />
        </div>
        <div style={{ fontWeight: 600, fontSize: 16 }}>Payment Method Saved</div>
        <div style={{ fontSize: 13, color: 'var(--nexus-text-secondary)' }}>
          Your card has been securely saved for future rent payments.
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p style={{ fontSize: 14, color: 'var(--nexus-text-secondary)' }}>
        Add a payment method for automatic rent payments. Your card details are handled securely by Stripe — we never see or store your card number.
      </p>

      <div style={{
        padding: 20,
        background: 'var(--nexus-bg-elevated)',
        borderRadius: 'var(--nexus-radius-sm)',
        border: '1px solid var(--nexus-border)',
      }}>
        <PaymentElement
          options={{
            layout: 'tabs',
          }}
        />
      </div>

      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '12px 16px',
          background: 'rgba(234, 67, 53, 0.1)',
          border: '1px solid rgba(234, 67, 53, 0.2)',
          borderRadius: 'var(--nexus-radius-sm)',
          color: 'var(--nexus-critical)',
          fontSize: 13,
        }}>
          <AlertTriangle size={14} />
          {error}
        </div>
      )}

      <button
        type="submit"
        className="btn-primary"
        disabled={!stripe || processing}
        style={{ width: '100%', padding: '14px 24px', marginTop: 8 }}
      >
        {processing ? (
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Loader2 size={16} className="spin" />
            Saving...
          </span>
        ) : (
          'Save Payment Method'
        )}
      </button>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 6, fontSize: 12, color: 'var(--nexus-text-muted)',
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="m7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        Secured by Stripe. PCI DSS compliant.
      </div>
    </form>
  );
}

/**
 * Wraps PaymentForm in Stripe Elements provider.
 * Fetches a SetupIntent client secret on mount.
 */
export default function PaymentStep({ onComplete }: PaymentStepProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function createSetupIntent() {
      try {
        const res = await fetch('/api/stripe/setup-intent', { method: 'POST' });
        const data = await res.json();

        if (data.clientSecret) {
          setClientSecret(data.clientSecret);
        } else {
          setError(data.error || 'Failed to initialize payment setup');
        }
      } catch {
        setError('Unable to connect to payment service');
      } finally {
        setLoading(false);
      }
    }

    // Only call if we have a Stripe key configured
    if (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
      createSetupIntent();
    } else {
      setLoading(false);
      setError('mock');
    }
  }, []);

  // Mock mode for development without Stripe keys
  if (error === 'mock') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p style={{ fontSize: 14, color: 'var(--nexus-text-secondary)' }}>
          Add a payment method for automatic rent payments.
        </p>
        <div style={{
          padding: 24, textAlign: 'center',
          background: 'rgba(66, 133, 244, 0.06)',
          border: '1px solid rgba(66, 133, 244, 0.15)',
          borderRadius: 'var(--nexus-radius-sm)',
        }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Development Mode</div>
          <div style={{ fontSize: 13, color: 'var(--nexus-text-secondary)' }}>
            Stripe Elements will appear here when NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is configured.
          </div>
        </div>
        <button className="btn-primary" onClick={onComplete} style={{ width: '100%', padding: '14px 24px' }}>
          Skip (Dev Mode)
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 48, color: 'var(--nexus-text-secondary)',
      }}>
        <Loader2 size={20} className="spin" style={{ marginRight: 8 }} />
        Initializing secure payment form...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: 20, textAlign: 'center',
        background: 'rgba(234, 67, 53, 0.06)',
        border: '1px solid rgba(234, 67, 53, 0.15)',
        borderRadius: 'var(--nexus-radius-sm)',
      }}>
        <AlertTriangle size={20} style={{ color: 'var(--nexus-critical)', marginBottom: 8 }} />
        <div style={{ fontWeight: 600, fontSize: 14 }}>Payment Setup Unavailable</div>
        <div style={{ fontSize: 13, color: 'var(--nexus-text-secondary)', marginTop: 4 }}>{error}</div>
      </div>
    );
  }

  if (!clientSecret) return null;

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: 'night',
          variables: {
            colorPrimary: '#6C63FF',
            colorBackground: '#111118',
            colorText: '#F1F1F3',
            colorTextSecondary: '#94A3B8',
            colorDanger: '#EA4335',
            borderRadius: '8px',
            fontFamily: 'Inter, sans-serif',
          },
          rules: {
            '.Input': {
              backgroundColor: '#16161F',
              border: '1px solid #2A2A3A',
            },
            '.Input:focus': {
              border: '1px solid #6C63FF',
              boxShadow: '0 0 0 2px rgba(108, 99, 255, 0.2)',
            },
          },
        },
      }}
    >
      <PaymentForm onComplete={onComplete} />
    </Elements>
  );
}
