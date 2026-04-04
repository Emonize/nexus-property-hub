'use client';

import { useState } from 'react';
import { Check, ChevronRight, User, Shield, CreditCard, FileText, Sparkles } from 'lucide-react';
import PaymentStep from '@/components/onboarding/PaymentStep';

type OnboardingStep = 'personal' | 'consent' | 'verification' | 'payment' | 'lease';

const steps: { id: OnboardingStep; label: string; icon: typeof User }[] = [
  { id: 'personal', label: 'Personal Info', icon: User },
  { id: 'consent', label: 'Background Check', icon: Shield },
  { id: 'verification', label: 'ID Verification', icon: Check },
  { id: 'payment', label: 'Payment Method', icon: CreditCard },
  { id: 'lease', label: 'Lease Review', icon: FileText },
];

export default function TenantOnboardingPage() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('personal');
  const [completed, setCompleted] = useState(false);
  const currentIndex = steps.findIndex(s => s.id === currentStep);

  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [zipcode, setZipcode] = useState('');
  const [ssn, setSsn] = useState('');
  const [consent, setConsent] = useState(false);

  // Verification State
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationDone, setVerificationDone] = useState(false);

  // Payment State
  const [paymentSaved, setPaymentSaved] = useState(false);

  const next = () => {
    if (currentIndex < steps.length - 1) setCurrentStep(steps[currentIndex + 1].id);
    else setCompleted(true);
  };

  const prev = () => {
    if (currentIndex > 0) setCurrentStep(steps[currentIndex - 1].id);
  };

  if (completed) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--nexus-bg)' }}>
        <div style={{ textAlign: 'center' }} className="fade-in">
          <div style={{ fontSize: 80, marginBottom: 24 }}>🏡</div>
          <h1 style={{ fontSize: 32, fontWeight: 800, fontFamily: 'var(--font-display)' }} className="text-gradient">Welcome Home!</h1>
          <p style={{ color: 'var(--nexus-text-secondary)', marginTop: 12, fontSize: 16 }}>Your onboarding is complete. Your lease is now active.</p>
          <a href="/dashboard" className="btn-primary" style={{ marginTop: 32, display: 'inline-flex', padding: '14px 28px' }}>Go to Dashboard</a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--nexus-bg)', padding: '40px 24px' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
          <div className="sidebar-logo-icon" style={{ width: 36, height: 36, fontSize: 16 }}>N</div>
          <span className="sidebar-logo-text">Rentova</span>
          <span style={{ color: 'var(--nexus-text-muted)', fontSize: 13, marginLeft: 'auto' }}>Tenant Onboarding</span>
        </div>

        {/* Step Indicators */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 32 }}>
          {steps.map((step, i) => (
            <div key={step.id} style={{
              flex: 1, height: 4, borderRadius: 2,
              background: i <= currentIndex ? 'var(--nexus-primary)' : 'var(--nexus-border)',
              transition: 'background 0.3s ease',
            }} />
          ))}
        </div>

        <div className="glass-card fade-in" style={{ padding: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            {(() => { const Icon = steps[currentIndex].icon; return <Icon size={20} style={{ color: 'var(--nexus-primary-light)' }} />; })()}
            <div>
              <div style={{ fontSize: 12, color: 'var(--nexus-text-muted)' }}>Step {currentIndex + 1} of {steps.length}</div>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>{steps[currentIndex].label}</h2>
            </div>
          </div>

          {currentStep === 'personal' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="grid-2">
                <div><label className="nexus-label">First Name</label><input className="nexus-input" placeholder="Legal first name" value={firstName} onChange={e => setFirstName(e.target.value)} /></div>
                <div><label className="nexus-label">Last Name</label><input className="nexus-input" placeholder="Legal last name" value={lastName} onChange={e => setLastName(e.target.value)} /></div>
              </div>
              <div><label className="nexus-label">Email</label><input className="nexus-input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} /></div>
              <div className="grid-2">
                <div><label className="nexus-label">Date of Birth</label><input className="nexus-input" type="date" value={dob} onChange={e => setDob(e.target.value)} /></div>
                <div><label className="nexus-label">Phone</label><input className="nexus-input" placeholder="+1 (555) 000-0000" value={phone} onChange={e => setPhone(e.target.value)} /></div>
              </div>
              <div><label className="nexus-label">Current Zipcode</label><input className="nexus-input" placeholder="e.g. 10001" value={zipcode} onChange={e => setZipcode(e.target.value)} /></div>
            </div>
          )}

          {currentStep === 'consent' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ padding: 20, background: 'rgba(0, 212, 170, 0.06)', border: '1px solid rgba(0, 212, 170, 0.15)', borderRadius: 'var(--nexus-radius-sm)' }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Why do we run a background check?</div>
                <p style={{ fontSize: 13, color: 'var(--nexus-text-secondary)', lineHeight: 1.6 }}>
                  Background checks help ensure a safe community. We use Checkr, an FCRA-compliant service. Your SSN is sent directly to Checkr over a 256-bit encrypted connection and is never stored on Rentova servers.
                </p>
              </div>
              
              <div>
                <label className="nexus-label">Social Security Number *</label>
                <input 
                  type="password" 
                  className="nexus-input" 
                  placeholder="XXX-XX-XXXX" 
                  value={ssn} 
                  onChange={e => setSsn(e.target.value)} 
                />
              </div>

              <label style={{ display: 'flex', gap: 12, fontSize: 14, cursor: 'pointer', padding: 16, background: 'var(--nexus-bg-elevated)', borderRadius: 'var(--nexus-radius-sm)' }}>
                <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />
                I authorize Rentova to run a background check via Checkr, including criminal history, eviction records, and identity verification.
              </label>
            </div>
          )}

          {currentStep === 'verification' && (
            <div className="onboarding-step">
              <div className="onboarding-icon"><Shield size={36} style={{ color: 'var(--nexus-accent)' }} /></div>
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Identity Verification</h3>
              
              {!verificationDone ? (
                <>
                  <p style={{ color: 'var(--nexus-text-secondary)', fontSize: 14, marginBottom: 24 }}>
                    You'll be redirected to Checkr to complete identity verification. This process takes 2-3 minutes.
                  </p>
                  <button 
                    className="btn-primary" 
                    onClick={async () => {
                      setIsVerifying(true);
                      try {
                        const res = await fetch('/api/checkr/initiate', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ firstName, lastName, email, dob, ssn, zipcode })
                        });
                        const data = await res.json();
                        if (data.status === 'mock_cleared') {
                          // Bypass redirect for sandbox MVP
                          setVerificationDone(true);
                        } else if (data.invitation_url) {
                          window.location.href = data.invitation_url;
                        }
                      } finally {
                        setIsVerifying(false);
                      }
                    }}
                    disabled={isVerifying || !ssn}
                  >
                    {isVerifying ? 'Generating secure link...' : <><Sparkles size={16} /> Begin Verification</>}
                  </button>
                </>
              ) : (
                <div style={{ padding: 16, background: 'rgba(52, 168, 83, 0.1)', color: 'var(--nexus-positive)', borderRadius: 8, marginTop: 16 }}>
                  Verification Cleared Successfully
                </div>
              )}
            </div>
          )}

          {currentStep === 'payment' && (
            <PaymentStep onComplete={() => setPaymentSaved(true)} />
          )}

          {currentStep === 'lease' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ padding: 20, background: 'var(--nexus-bg-elevated)', borderRadius: 'var(--nexus-radius-sm)', border: '1px solid var(--nexus-border)' }}>
                <div className="grid-2" style={{ gap: 12 }}>
                  <div><div style={{ fontSize: 12, color: 'var(--nexus-text-muted)' }}>Space</div><div style={{ fontWeight: 600 }}>Bedroom 1, Unit 1A</div></div>
                  <div><div style={{ fontSize: 12, color: 'var(--nexus-text-muted)' }}>Monthly Rent</div><div style={{ fontWeight: 600, color: 'var(--nexus-accent)' }}>$1,200/mo</div></div>
                  <div><div style={{ fontSize: 12, color: 'var(--nexus-text-muted)' }}>Start Date</div><div style={{ fontWeight: 600 }}>April 1, 2026</div></div>
                  <div><div style={{ fontSize: 12, color: 'var(--nexus-text-muted)' }}>Duration</div><div style={{ fontWeight: 600 }}>12 months</div></div>
                </div>
              </div>
              <label style={{ display: 'flex', gap: 12, fontSize: 14, cursor: 'pointer' }}>
                <input type="checkbox" />
                I have read and agree to the lease terms.
              </label>
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
            <button className="btn-secondary" onClick={prev} disabled={currentIndex === 0}>Back</button>
            {(currentStep === 'verification' && !verificationDone) || (currentStep === 'payment' && !paymentSaved) ? (
              <div />
            ) : (
              <button
                className="btn-primary"
                onClick={next}
                disabled={(currentStep === 'consent' && (!consent || !ssn)) || (currentStep === 'personal' && (!firstName || !lastName))}
              >
                {currentIndex === steps.length - 1 ? 'Sign Lease & Complete' : 'Continue'} <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
