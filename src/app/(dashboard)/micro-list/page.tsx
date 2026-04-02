'use client';

import { useState } from 'react';
import { Layers, Upload, ChevronRight, Check, Sparkles, DollarSign, Home } from 'lucide-react';

type WizardStep = 'select' | 'scan' | 'configure' | 'preview' | 'publish';

const steps: { id: WizardStep; label: string }[] = [
  { id: 'select', label: 'Select Property' },
  { id: 'scan', label: 'Floor Plan AI' },
  { id: 'configure', label: 'Configure' },
  { id: 'preview', label: 'Preview' },
  { id: 'publish', label: 'Publish' },
];

const demoRooms = [
  { name: 'Bedroom 1', type: 'room', area: 180, rent: 950, amenities: ['furnished', 'closet'] },
  { name: 'Bedroom 2', type: 'room', area: 160, rent: 850, amenities: ['window', 'closet'] },
  { name: 'Living Room', type: 'room', area: 250, rent: 0, amenities: [] },
  { name: 'Kitchen', type: 'room', area: 120, rent: 0, amenities: [] },
  { name: 'Bathroom', type: 'room', area: 60, rent: 0, amenities: [] },
];

export default function MicroListPage() {
  const [currentStep, setCurrentStep] = useState<WizardStep>('select');
  const [rooms, setRooms] = useState(demoRooms);
  const [published, setPublished] = useState(false);

  const currentIndex = steps.findIndex(s => s.id === currentStep);
  const totalRent = rooms.reduce((sum, r) => sum + r.rent, 0);

  const nextStep = () => {
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].id);
    }
  };

  const prevStep = () => {
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].id);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Micro-Listing</h1>
          <p className="page-subtitle">Split a property into individually rentable spaces in under 60 seconds</p>
        </div>
      </div>

      {/* Wizard Progress */}
      <div className="wizard-progress">
        {steps.map((step, i) => (
          <div key={step.id} style={{ display: 'contents' }}>
            <div className={`wizard-step ${i === currentIndex ? 'active' : i < currentIndex ? 'completed' : ''}`}>
              <div className="wizard-step-number">
                {i < currentIndex ? <Check size={14} /> : i + 1}
              </div>
              {step.label}
            </div>
            {i < steps.length - 1 && (
              <div className={`wizard-connector ${i < currentIndex ? 'completed' : ''}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="glass-card fade-in" style={{ padding: 32, minHeight: 400 }}>
        {currentStep === 'select' && (
          <div className="onboarding-step">
            <div className="onboarding-icon"><Home size={36} style={{ color: 'var(--nexus-primary-light)' }} /></div>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Select a property to split</h2>
            <p style={{ color: 'var(--nexus-text-secondary)', marginBottom: 24 }}>Choose an existing property or paste an address</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              {['Nexus Tower', 'Unit 1A', 'Unit 3C'].map(name => (
                <button key={name} className="btn-secondary" style={{ padding: '16px 24px' }} onClick={nextStep}>
                  <Building2Icon /> {name}
                </button>
              ))}
            </div>
            <div style={{ margin: '24px 0', color: 'var(--nexus-text-muted)', fontSize: 13 }}>— or —</div>
            <input className="nexus-input" placeholder="Paste a new address..." style={{ maxWidth: 400, margin: '0 auto' }} />
          </div>
        )}

        {currentStep === 'scan' && (
          <div className="onboarding-step">
            <div className="onboarding-icon"><Sparkles size={36} style={{ color: 'var(--nexus-accent)' }} /></div>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>AI Floor Plan Analysis</h2>
            <p style={{ color: 'var(--nexus-text-secondary)', marginBottom: 24 }}>Upload a floor plan and let AI detect rooms automatically</p>
            <div style={{
              border: '2px dashed var(--nexus-border)',
              borderRadius: 'var(--nexus-radius-lg)',
              padding: '60px 40px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'border-color 0.2s',
              maxWidth: 500,
              margin: '0 auto',
            }}>
              <Upload size={40} style={{ color: 'var(--nexus-text-muted)', marginBottom: 12 }} />
              <div style={{ fontWeight: 600 }}>Drop floor plan here</div>
              <div style={{ color: 'var(--nexus-text-muted)', fontSize: 13, marginTop: 4 }}>JPG, PNG, or PDF up to 10MB</div>
            </div>
            <button className="btn-primary" style={{ marginTop: 24 }} onClick={nextStep}>
              <Sparkles size={16} /> Use Demo Floor Plan
            </button>
          </div>
        )}

        {currentStep === 'configure' && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Configure Detected Rooms</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {rooms.map((room, i) => (
                <div key={room.name} className="nexus-card" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <div style={{ fontWeight: 600, flex: 1 }}>
                    <input className="nexus-input" value={room.name} onChange={(e) => {
                      const updated = [...rooms];
                      updated[i].name = e.target.value;
                      setRooms(updated);
                    }} style={{ fontWeight: 600 }} />
                  </div>
                  <div style={{ width: 100 }}>
                    <div style={{ fontSize: 11, color: 'var(--nexus-text-muted)' }}>Area</div>
                    <div style={{ fontWeight: 600 }}>{room.area} sqft</div>
                  </div>
                  <div style={{ width: 140 }}>
                    <div style={{ fontSize: 11, color: 'var(--nexus-text-muted)' }}>Monthly Rent</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <DollarSign size={14} />
                      <input className="nexus-input" type="number" value={room.rent} onChange={(e) => {
                        const updated = [...rooms];
                        updated[i].rent = Number(e.target.value);
                        setRooms(updated);
                      }} style={{ width: 100 }} />
                    </div>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                    <input type="checkbox" checked={room.rent > 0} onChange={(e) => {
                      const updated = [...rooms];
                      updated[i].rent = e.target.checked ? 800 : 0;
                      setRooms(updated);
                    }} />
                    Rentable
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentStep === 'preview' && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Revenue Preview</h2>
            <div className="grid-2" style={{ marginBottom: 24 }}>
              <div className="kpi-card">
                <div className="kpi-label">If Fully Occupied</div>
                <div className="kpi-value" style={{ color: 'var(--nexus-positive)' }}>${totalRent.toLocaleString()}/mo</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Revenue Uplift</div>
                <div className="kpi-value text-gradient">+{Math.round((totalRent / 2200 - 1) * 100)}%</div>
                <div style={{ fontSize: 13, color: 'var(--nexus-text-secondary)' }}>vs. renting as single unit ($2,200/mo)</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rooms.filter(r => r.rent > 0).map(r => (
                <div key={r.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--nexus-bg-elevated)', borderRadius: 'var(--nexus-radius-sm)' }}>
                  <span>{r.name} ({r.area} sqft)</span>
                  <span style={{ fontWeight: 700, color: 'var(--nexus-accent)' }}>${r.rent}/mo</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentStep === 'publish' && !published && (
          <div className="onboarding-step">
            <div className="onboarding-icon">🚀</div>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Ready to publish!</h2>
            <p style={{ color: 'var(--nexus-text-secondary)', marginBottom: 24 }}>
              {rooms.filter(r => r.rent > 0).length} spaces will be created and listed.
              Estimated monthly revenue: <strong style={{ color: 'var(--nexus-accent)' }}>${totalRent.toLocaleString()}</strong>
            </p>
            <button className="btn-primary" style={{ padding: '16px 40px', fontSize: 16 }} onClick={() => setPublished(true)}>
              Publish All Spaces
            </button>
          </div>
        )}

        {currentStep === 'publish' && published && (
          <div className="onboarding-step">
            <div style={{ fontSize: 80, marginBottom: 16 }}>🎉</div>
            <h2 style={{ fontSize: 28, fontWeight: 800 }} className="text-gradient">Spaces Published!</h2>
            <p style={{ color: 'var(--nexus-text-secondary)', marginTop: 8, fontSize: 16 }}>
              {rooms.filter(r => r.rent > 0).length} spaces are now live and accepting tenants.
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      {!published && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
          <button className="btn-secondary" onClick={prevStep} disabled={currentIndex === 0}>Back</button>
          {currentStep !== 'publish' && (
            <button className="btn-primary" onClick={nextStep}>
              Continue <ChevronRight size={16} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Building2Icon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>;
}
