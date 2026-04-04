'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Layers, Upload, ChevronRight, Check, Sparkles, DollarSign, Home, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Space, SpaceType } from '@/types/database';

type WizardStep = 'select' | 'scan' | 'configure' | 'preview' | 'publish';

const steps: { id: WizardStep; label: string }[] = [
  { id: 'select', label: 'Select Property' },
  { id: 'scan', label: 'Floor Plan AI' },
  { id: 'configure', label: 'Configure' },
  { id: 'preview', label: 'Preview' },
  { id: 'publish', label: 'Publish' },
];

interface DetectedRoom {
  name: string;
  type: SpaceType;
  area_sqft: number;
  rent: number;
  rentable: boolean;
  amenities: string[];
  bounds: { x: number; y: number; w: number; h: number };
}

const amenityOptions = [
  'furnished', 'window', 'closet', 'ensuite', 'ac', 'heating',
  'balcony', 'parking', 'laundry', 'dishwasher', 'pet-friendly', 'hardwood',
];

export default function MicroListPage() {
  const [currentStep, setCurrentStep] = useState<WizardStep>('select');
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null);
  const [rooms, setRooms] = useState<DetectedRoom[]>([]);
  const [sharedSpaces, setSharedSpaces] = useState<string[]>([]);
  const [published, setPublished] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [singleUnitRent, setSingleUnitRent] = useState(2200);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentIndex = steps.findIndex(s => s.id === currentStep);
  const rentableRooms = rooms.filter(r => r.rentable);
  const totalRent = rentableRooms.reduce((sum, r) => sum + r.rent, 0);

  // Fetch owner's spaces for selection
  useEffect(() => {
    async function loadSpaces() {
      const { getSpaces } = await import('@/lib/actions/spaces');
      const result = await getSpaces();
      if (result?.data) setSpaces(result.data);
    }
    loadSpaces();
  }, []);

  const nextStep = () => {
    if (currentStep === 'scan' && rooms.length === 0) return;
    if (currentIndex < steps.length - 1) setCurrentStep(steps[currentIndex + 1].id);
  };

  const prevStep = () => {
    if (currentIndex > 0) setCurrentStep(steps[currentIndex - 1].id);
  };

  const handleSelectSpace = (space: Space) => {
    setSelectedSpace(space);
    setSingleUnitRent(Number(space.base_rent) || 2200);
    setCurrentStep('scan');
  };

  // Call floor plan AI
  const analyzeFloorPlan = async (imageBase64?: string) => {
    setScanning(true);
    try {
      const res = await fetch('/api/ai/floor-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_base64: imageBase64 || null,
        }),
      });
      const data = await res.json();

      if (data.rooms) {
        const detected: DetectedRoom[] = data.rooms.map((r: any) => ({
          name: r.name,
          type: (r.type || 'room') as SpaceType,
          area_sqft: r.area_sqft || 0,
          rent: estimateRent(r.area_sqft || 0, r.name),
          rentable: !isSharedSpace(r.name),
          amenities: [],
          bounds: r.bounds || { x: 0, y: 0, w: 50, h: 50 },
        }));
        setRooms(detected);
        setSharedSpaces(data.shared_spaces || []);
        toast.success(`AI detected ${detected.length} rooms`);
      }
    } catch {
      toast.error('Floor plan analysis failed');
    }
    setScanning(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      await analyzeFloorPlan(base64);
    };
    reader.readAsDataURL(file);
  };

  // Publish — create all spaces in DB
  const handlePublish = async () => {
    if (!selectedSpace) return;
    setPublishing(true);
    try {
      const { microListSpaces } = await import('@/lib/actions/spaces');
      const result = await microListSpaces({
        parent_space_id: selectedSpace.id,
        rooms: rentableRooms.map(r => ({
          name: r.name,
          type: r.type,
          area_sqft: r.area_sqft,
          rentable: r.rentable,
          base_rent: r.rent,
          amenities: r.amenities,
        })),
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        setPublished(true);
        toast.success(`${result.data?.length || 0} spaces created!`);
      }
    } catch {
      toast.error('Publishing failed');
    }
    setPublishing(false);
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

        {/* Step 1: Select Property */}
        {currentStep === 'select' && (
          <div className="onboarding-step">
            <div className="onboarding-icon"><Home size={36} style={{ color: 'var(--nexus-primary-light)' }} /></div>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Select a property to split</h2>
            <p style={{ color: 'var(--nexus-text-secondary)', marginBottom: 24 }}>Choose an existing property from your portfolio</p>

            {spaces.length > 0 ? (
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                {spaces.filter(s => s.type === 'building' || s.type === 'home' || s.type === 'unit').map(space => (
                  <button
                    key={space.id}
                    className="btn-secondary"
                    style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 8 }}
                    onClick={() => handleSelectSpace(space)}
                  >
                    <Building2Icon /> {space.name}
                    {space.base_rent ? <span style={{ color: 'var(--nexus-text-muted)', fontSize: 12 }}>${Number(space.base_rent)}/mo</span> : null}
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ color: 'var(--nexus-text-muted)', padding: 24 }}>
                No properties found. Add a property in the Spaces page first.
              </div>
            )}
          </div>
        )}

        {/* Step 2: AI Floor Plan Scan */}
        {currentStep === 'scan' && (
          <div className="onboarding-step">
            <div className="onboarding-icon"><Sparkles size={36} style={{ color: 'var(--nexus-accent)' }} /></div>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>AI Floor Plan Analysis</h2>
            <p style={{ color: 'var(--nexus-text-secondary)', marginBottom: 24 }}>
              Upload a floor plan for <strong>{selectedSpace?.name}</strong> and let AI detect rooms automatically
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />

            <div
              style={{
                border: '2px dashed var(--nexus-border)',
                borderRadius: 'var(--nexus-radius-lg)',
                padding: '60px 40px',
                textAlign: 'center',
                cursor: 'pointer',
                maxWidth: 500,
                margin: '0 auto',
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              {scanning ? (
                <>
                  <Loader2 size={40} className="spin" style={{ color: 'var(--nexus-accent)', marginBottom: 12 }} />
                  <div style={{ fontWeight: 600 }}>Analyzing floor plan...</div>
                  <div style={{ color: 'var(--nexus-text-muted)', fontSize: 13, marginTop: 4 }}>Gemini is detecting rooms</div>
                </>
              ) : (
                <>
                  <Upload size={40} style={{ color: 'var(--nexus-text-muted)', marginBottom: 12 }} />
                  <div style={{ fontWeight: 600 }}>Drop floor plan here</div>
                  <div style={{ color: 'var(--nexus-text-muted)', fontSize: 13, marginTop: 4 }}>JPG, PNG, or PDF up to 10MB</div>
                </>
              )}
            </div>

            <div style={{ margin: '24px 0', color: 'var(--nexus-text-muted)', fontSize: 13 }}>— or —</div>

            <button
              className="btn-primary"
              onClick={() => analyzeFloorPlan()}
              disabled={scanning}
            >
              <Sparkles size={16} /> Use Demo Floor Plan
            </button>

            {rooms.length > 0 && (
              <div style={{ marginTop: 24, padding: 16, background: 'rgba(52, 168, 83, 0.06)', borderRadius: 8, border: '1px solid rgba(52, 168, 83, 0.15)' }}>
                <div style={{ fontWeight: 600, color: 'var(--nexus-positive)', marginBottom: 8 }}>
                  {rooms.length} rooms detected
                </div>
                <div style={{ fontSize: 13, color: 'var(--nexus-text-secondary)' }}>
                  {rooms.map(r => r.name).join(', ')}
                  {sharedSpaces.length > 0 && ` · Shared: ${sharedSpaces.join(', ')}`}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Configure Rooms */}
        {currentStep === 'configure' && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Configure Detected Rooms</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {rooms.map((room, i) => (
                <div key={i} className="nexus-card" style={{ padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 150 }}>
                      <div style={{ fontSize: 11, color: 'var(--nexus-text-muted)', marginBottom: 4 }}>Name</div>
                      <input
                        className="nexus-input"
                        value={room.name}
                        onChange={(e) => {
                          const updated = [...rooms];
                          updated[i] = { ...updated[i], name: e.target.value };
                          setRooms(updated);
                        }}
                        style={{ fontWeight: 600 }}
                      />
                    </div>
                    <div style={{ width: 100 }}>
                      <div style={{ fontSize: 11, color: 'var(--nexus-text-muted)', marginBottom: 4 }}>Area</div>
                      <div style={{ fontWeight: 600, padding: '10px 0' }}>{room.area_sqft} sqft</div>
                    </div>
                    <div style={{ width: 140 }}>
                      <div style={{ fontSize: 11, color: 'var(--nexus-text-muted)', marginBottom: 4 }}>Monthly Rent</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <DollarSign size={14} />
                        <input
                          className="nexus-input"
                          type="number"
                          value={room.rent}
                          onChange={(e) => {
                            const updated = [...rooms];
                            updated[i] = { ...updated[i], rent: Number(e.target.value) };
                            setRooms(updated);
                          }}
                          style={{ width: 100 }}
                          disabled={!room.rentable}
                        />
                      </div>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={room.rentable}
                        onChange={(e) => {
                          const updated = [...rooms];
                          updated[i] = { ...updated[i], rentable: e.target.checked, rent: e.target.checked ? estimateRent(room.area_sqft, room.name) : 0 };
                          setRooms(updated);
                        }}
                      />
                      Rentable
                    </label>
                  </div>

                  {/* Amenities */}
                  {room.rentable && (
                    <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {amenityOptions.map(a => (
                        <button
                          key={a}
                          className={room.amenities.includes(a) ? 'btn-primary' : 'btn-secondary'}
                          style={{ padding: '4px 10px', fontSize: 11 }}
                          onClick={() => {
                            const updated = [...rooms];
                            const amenities = room.amenities.includes(a)
                              ? room.amenities.filter(x => x !== a)
                              : [...room.amenities, a];
                            updated[i] = { ...updated[i], amenities };
                            setRooms(updated);
                          }}
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Revenue Preview */}
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
                <div className="kpi-value text-gradient">
                  {singleUnitRent > 0
                    ? `+${Math.round((totalRent / singleUnitRent - 1) * 100)}%`
                    : `$${totalRent.toLocaleString()}`}
                </div>
                {singleUnitRent > 0 && (
                  <div style={{ fontSize: 13, color: 'var(--nexus-text-secondary)' }}>
                    vs. renting as single unit (${singleUnitRent.toLocaleString()}/mo)
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rentableRooms.map(r => (
                <div key={r.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--nexus-bg-elevated)', borderRadius: 'var(--nexus-radius-sm)' }}>
                  <span>{r.name} ({r.area_sqft} sqft) — {r.amenities.length > 0 ? r.amenities.join(', ') : 'no amenities'}</span>
                  <span style={{ fontWeight: 700, color: 'var(--nexus-accent)' }}>${r.rent}/mo</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 5: Publish */}
        {currentStep === 'publish' && !published && (
          <div className="onboarding-step">
            <div className="onboarding-icon">🚀</div>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Ready to publish!</h2>
            <p style={{ color: 'var(--nexus-text-secondary)', marginBottom: 8 }}>
              <strong>{rentableRooms.length}</strong> rentable spaces will be created under <strong>{selectedSpace?.name}</strong>.
            </p>
            <p style={{ color: 'var(--nexus-text-secondary)', marginBottom: 24 }}>
              Estimated monthly revenue: <strong style={{ color: 'var(--nexus-accent)' }}>${totalRent.toLocaleString()}</strong>
            </p>
            <button
              className="btn-primary"
              style={{ padding: '16px 40px', fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}
              onClick={handlePublish}
              disabled={publishing}
            >
              {publishing ? <><Loader2 size={16} className="spin" /> Creating Spaces...</> : 'Publish All Spaces'}
            </button>
          </div>
        )}

        {currentStep === 'publish' && published && (
          <div className="onboarding-step">
            <div style={{ fontSize: 80, marginBottom: 16 }}>🎉</div>
            <h2 style={{ fontSize: 28, fontWeight: 800 }} className="text-gradient">Spaces Published!</h2>
            <p style={{ color: 'var(--nexus-text-secondary)', marginTop: 8, fontSize: 16 }}>
              {rentableRooms.length} spaces are now live and accepting tenants.
            </p>
            <button className="btn-primary" style={{ marginTop: 24 }} onClick={() => window.location.href = '/spaces'}>
              View in Spaces
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      {!published && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
          <button className="btn-secondary" onClick={prevStep} disabled={currentIndex === 0}>Back</button>
          {currentStep !== 'publish' && (
            <button
              className="btn-primary"
              onClick={nextStep}
              disabled={(currentStep === 'scan' && rooms.length === 0) || (currentStep === 'select')}
            >
              Continue <ChevronRight size={16} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function estimateRent(areaSqft: number, name: string): number {
  const lower = name.toLowerCase();
  if (lower.includes('kitchen') || lower.includes('bathroom') || lower.includes('living') || lower.includes('hallway')) {
    return 0; // shared spaces default to not rentable
  }
  // ~$5/sqft/month base estimate
  return Math.round(areaSqft * 5 / 50) * 50; // round to nearest $50
}

function isSharedSpace(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.includes('kitchen') || lower.includes('bathroom') || lower.includes('living') || lower.includes('hallway') || lower.includes('laundry');
}

function Building2Icon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>;
}
