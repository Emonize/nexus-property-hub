'use client';

import { useState, useEffect, useCallback } from 'react';
import HierarchyNavigator from '@/components/spaces/HierarchyNavigator';
import { Plus, Search, Filter, Map, X, Loader2, Pencil } from 'lucide-react';
import type { Space, SpaceType, SpaceStatus } from '@/types/database';
import { createSpace, updateSpace, deleteSpace, reparentSpace } from '@/lib/actions/spaces';

const SPACE_TYPES: { value: SpaceType; label: string; icon: string }[] = [
  { value: 'building', label: 'Building', icon: '🏢' },
  { value: 'home', label: 'Home', icon: '🏡' },
  { value: 'unit', label: 'Unit / Apartment', icon: '🏠' },
  { value: 'room', label: 'Room', icon: '🛏️' },
  { value: 'garage', label: 'Garage', icon: '🚗' },
  { value: 'desk', label: 'Desk / Co-work', icon: '🖥️' },
  { value: 'storage', label: 'Storage', icon: '📦' },
  { value: 'lot', label: 'Parking Lot', icon: '🅿️' },
  { value: 'other', label: 'Other', icon: '📍' },
];

const STATUSES: { value: SpaceStatus; label: string }[] = [
  { value: 'vacant', label: 'Vacant' },
  { value: 'occupied', label: 'Occupied' },
  { value: 'listed', label: 'Listed' },
  { value: 'unlisted', label: 'Unlisted' },
  { value: 'maintenance', label: 'Under Maintenance' },
];

const AMENITY_OPTIONS = [
  'washer_dryer', 'dishwasher', 'central_ac', 'heating',
  'furnished', 'ensuite', 'window', 'closet', 'balcony',
  'parking', 'gym', 'pool', 'elevator', 'doorman',
  'pet_friendly', 'storage', 'roof_access', 'garden',
];

const demoSpaces: Space[] = [
  { id: 'b001', parent_id: null, owner_id: 'a001', name: 'Nexus Tower', type: 'building', address: { street: '123 Main St', city: 'Brooklyn', state: 'NY', zip: '11201', country: 'US' }, floor_plan_url: null, area_sqft: 12000, base_rent: null, currency: 'usd', amenities: [], status: 'occupied', listing_photos: [], meta: {}, created_at: '2026-01-01', updated_at: '2026-03-01' },
  { id: 'b010', parent_id: 'b001', owner_id: 'a001', name: 'Unit 1A', type: 'unit', address: null, floor_plan_url: null, area_sqft: 1200, base_rent: 3200, currency: 'usd', amenities: ['washer_dryer', 'dishwasher', 'central_ac'], status: 'occupied', listing_photos: [], meta: {}, created_at: '2026-01-01', updated_at: '2026-03-01' },
  { id: 'b011', parent_id: 'b001', owner_id: 'a001', name: 'Unit 2B', type: 'unit', address: null, floor_plan_url: null, area_sqft: 950, base_rent: 2800, currency: 'usd', amenities: ['dishwasher'], status: 'occupied', listing_photos: [], meta: {}, created_at: '2026-01-01', updated_at: '2026-03-01' },
  { id: 'b012', parent_id: 'b001', owner_id: 'a001', name: 'Unit 3C', type: 'unit', address: null, floor_plan_url: null, area_sqft: 800, base_rent: 2200, currency: 'usd', amenities: [], status: 'vacant', listing_photos: [], meta: {}, created_at: '2026-01-01', updated_at: '2026-03-01' },
  { id: 'b013', parent_id: 'b001', owner_id: 'a001', name: 'Garage Bay A', type: 'garage', address: null, floor_plan_url: null, area_sqft: 200, base_rent: 350, currency: 'usd', amenities: [], status: 'listed', listing_photos: [], meta: {}, created_at: '2026-01-01', updated_at: '2026-03-01' },
  { id: 'b100', parent_id: 'b010', owner_id: 'a001', name: 'Bedroom 1', type: 'room', address: null, floor_plan_url: null, area_sqft: 300, base_rent: 1200, currency: 'usd', amenities: ['furnished', 'ensuite'], status: 'occupied', listing_photos: [], meta: {}, created_at: '2026-01-01', updated_at: '2026-03-01' },
  { id: 'b101', parent_id: 'b010', owner_id: 'a001', name: 'Bedroom 2', type: 'room', address: null, floor_plan_url: null, area_sqft: 280, base_rent: 1100, currency: 'usd', amenities: ['window', 'closet'], status: 'occupied', listing_photos: [], meta: {}, created_at: '2026-01-01', updated_at: '2026-03-01' },
  { id: 'b102', parent_id: 'b010', owner_id: 'a001', name: 'Bedroom 3', type: 'room', address: null, floor_plan_url: null, area_sqft: 250, base_rent: 900, currency: 'usd', amenities: [], status: 'occupied', listing_photos: [], meta: {}, created_at: '2026-01-01', updated_at: '2026-03-01' },
];

// ─── Shared Space Form Component ──────────────────────────────────────────────

function SpaceFormModal({
  mode,
  initialData,
  parentId,
  parentName,
  onClose,
  onSuccess,
}: {
  mode: 'create' | 'edit';
  initialData?: Space;
  parentId: string | null;
  parentName: string | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(initialData?.name || '');
  const [type, setType] = useState<SpaceType>(initialData?.type || 'building');
  const [status, setStatus] = useState<SpaceStatus>(initialData?.status || 'vacant');
  const [areaSqft, setAreaSqft] = useState(initialData?.area_sqft?.toString() || '');
  const [baseRent, setBaseRent] = useState(initialData?.base_rent?.toString() || '');
  const addr = initialData?.address as Record<string, string> | null | undefined;
  const [street, setStreet] = useState(addr?.street || '');
  const [city, setCity] = useState(addr?.city || '');
  const [state, setState] = useState(addr?.state || '');
  const [zip, setZip] = useState(addr?.zip || '');
  const [amenities, setAmenities] = useState<string[]>(initialData?.amenities || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isTopLevel = mode === 'create' ? !parentId : !initialData?.parent_id;

  const toggleAmenity = (a: string) => {
    setAmenities(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required'); return; }

    setSaving(true);
    setError('');

    const address = street || city || state || zip
      ? { street, city, state, zip, country: 'US' }
      : undefined;

    if (mode === 'edit' && initialData) {
      const result = await updateSpace(initialData.id, {
        name: name.trim(),
        type,
        status,
        area_sqft: areaSqft ? Number(areaSqft) : null,
        base_rent: baseRent ? Number(baseRent) : null,
        address: address || null,
        amenities,
      });
      if (result.error) {
        setError(result.error);
        setSaving(false);
      } else {
        onSuccess();
        onClose();
      }
    } else {
      const result = await createSpace({
        name: name.trim(),
        type,
        parent_id: parentId,
        address,
        area_sqft: areaSqft ? Number(areaSqft) : undefined,
        base_rent: baseRent ? Number(baseRent) : undefined,
        amenities,
        status,
      });
      if (result.error) {
        setError(result.error);
        setSaving(false);
      } else {
        onSuccess();
        onClose();
      }
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
    }} onClick={onClose}>
      <div className="glass-card fade-in" style={{
        width: '100%', maxWidth: 640, maxHeight: '90vh', overflow: 'auto',
        padding: 32, position: 'relative',
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-display)' }}>
              {mode === 'edit' ? 'Edit Space' : parentId ? 'Add Child Space' : 'Add Property'}
            </h2>
            {mode === 'edit' && initialData && (
              <p style={{ fontSize: 13, color: 'var(--nexus-text-muted)', marginTop: 4 }}>
                Editing <span style={{ color: 'var(--nexus-primary-light)', fontWeight: 600 }}>{initialData.name}</span>
              </p>
            )}
            {mode === 'create' && parentName && (
              <p style={{ fontSize: 13, color: 'var(--nexus-text-muted)', marginTop: 4 }}>
                Adding inside <span style={{ color: 'var(--nexus-primary-light)', fontWeight: 600 }}>{parentName}</span>
              </p>
            )}
          </div>
          <button onClick={onClose} className="btn-secondary" style={{ width: 36, height: 36, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10 }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Name & Type */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label className="nexus-label">Name *</label>
              <input
                className="nexus-input"
                placeholder="e.g. Sunrise Apartments"
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label className="nexus-label">Type</label>
              <select
                className="nexus-select"
                value={type}
                onChange={e => setType(e.target.value as SpaceType)}
              >
                {SPACE_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Status & Area & Rent */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label className="nexus-label">Status</label>
              <select
                className="nexus-select"
                value={status}
                onChange={e => setStatus(e.target.value as SpaceStatus)}
              >
                {STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="nexus-label">Area (sqft)</label>
              <input
                className="nexus-input"
                type="number"
                placeholder="1200"
                value={areaSqft}
                onChange={e => setAreaSqft(e.target.value)}
              />
            </div>
            <div>
              <label className="nexus-label">Base Rent ($/mo)</label>
              <input
                className="nexus-input"
                type="number"
                placeholder="2500"
                value={baseRent}
                onChange={e => setBaseRent(e.target.value)}
              />
            </div>
          </div>

          {/* Address — only for top-level */}
          {isTopLevel && (
            <>
              <label className="nexus-label" style={{ marginBottom: 8 }}>Address</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginBottom: 16 }}>
                <input className="nexus-input" placeholder="Street address" value={street} onChange={e => setStreet(e.target.value)} />
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
                  <input className="nexus-input" placeholder="City" value={city} onChange={e => setCity(e.target.value)} />
                  <input className="nexus-input" placeholder="State" value={state} onChange={e => setState(e.target.value)} />
                  <input className="nexus-input" placeholder="ZIP" value={zip} onChange={e => setZip(e.target.value)} />
                </div>
              </div>
            </>
          )}

          {/* Amenities */}
          <label className="nexus-label" style={{ marginBottom: 8 }}>Amenities</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
            {AMENITY_OPTIONS.map(a => (
              <button
                key={a}
                type="button"
                onClick={() => toggleAmenity(a)}
                style={{
                  padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                  border: '1px solid',
                  borderColor: amenities.includes(a) ? 'var(--nexus-primary)' : 'var(--nexus-border)',
                  background: amenities.includes(a) ? 'rgba(108, 99, 255, 0.15)' : 'transparent',
                  color: amenities.includes(a) ? 'var(--nexus-primary-light)' : 'var(--nexus-text-secondary)',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {a.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, marginBottom: 16,
              background: 'rgba(234, 67, 53, 0.1)', border: '1px solid rgba(234, 67, 53, 0.2)',
              color: 'var(--nexus-critical)', fontSize: 13,
            }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving} style={{ minWidth: 140 }}>
              {saving
                ? <><Loader2 size={14} className="spin" /> {mode === 'edit' ? 'Saving...' : 'Creating...'}</>
                : mode === 'edit'
                  ? <><Pencil size={14} /> Save Changes</>
                  : <><Plus size={14} /> Create Space</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SpacesPage() {
  const [search, setSearch] = useState('');
  const [spaces, setSpaces] = useState<Space[]>(demoSpaces);
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [addParentId, setAddParentId] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchSpaces = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/spaces');
      if (res.ok) {
        const data = await res.json();
        if (data?.data && data.data.length > 0) {
          setSpaces(data.data);
          setIsLive(true);
        }
      }
    } catch {
      // Keep demo data
    }
  }, []);

  useEffect(() => {
    fetchSpaces();
  }, [fetchSpaces]);

  const handleDelete = async (id: string) => {
    if (!isLive) return;
    setDeleting(true);
    const result = await deleteSpace(id);
    if (!result.error) {
      setSelectedSpace(null);
      fetchSpaces();
    }
    setDeleting(false);
  };

  const handleReparent = async (spaceId: string, newParentId: string | null) => {
    if (!isLive) return;
    await reparentSpace(spaceId, newParentId);
    fetchSpaces();
  };

  const openAddModal = (parentId: string | null) => {
    setAddParentId(parentId);
    setModalMode('create');
    setShowModal(true);
  };

  const openEditModal = (space: Space) => {
    setSelectedSpace(space);
    setModalMode('edit');
    setShowModal(true);
  };

  const handleModalSuccess = () => {
    fetchSpaces();
    // If editing, refresh the selected space
    if (modalMode === 'edit' && selectedSpace) {
      // Fetch updated space after a short delay to let revalidation happen
      setTimeout(async () => {
        const res = await fetch('/api/dashboard/spaces');
        if (res.ok) {
          const data = await res.json();
          if (data?.data) {
            setSpaces(data.data);
            const updated = data.data.find((s: Space) => s.id === selectedSpace.id);
            if (updated) setSelectedSpace(updated);
          }
        }
      }, 300);
    }
  };

  const getParentName = (): string | null => {
    if (!addParentId) return null;
    const parent = spaces.find(s => s.id === addParentId);
    return parent?.name || null;
  };

  const filteredSpaces = search
    ? spaces.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
    : spaces;

  const stats = {
    total: spaces.length,
    occupied: spaces.filter(s => s.status === 'occupied').length,
    vacant: spaces.filter(s => s.status === 'vacant').length,
    totalRent: spaces.reduce((sum, s) => sum + (Number(s.base_rent) || 0), 0),
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Spaces</h1>
          <p className="page-subtitle">
            Manage your property hierarchy
            {!isLive && (
              <span style={{ marginLeft: 12, padding: '2px 8px', borderRadius: 6, background: 'rgba(251, 188, 4, 0.15)', color: 'var(--nexus-warning)', fontSize: 11, fontWeight: 600 }}>
                DEMO MODE
              </span>
            )}
          </p>
        </div>
        <button className="btn-primary" onClick={() => openAddModal(null)}>
          <Plus size={16} />
          Add Property
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        {[
          { label: 'Total Spaces', value: stats.total, color: 'var(--nexus-primary-light)' },
          { label: 'Occupied', value: stats.occupied, color: 'var(--nexus-positive)' },
          { label: 'Vacant', value: stats.vacant, color: 'var(--nexus-warning)' },
          { label: 'Total Rent', value: `$${stats.totalRent.toLocaleString()}/mo`, color: 'var(--nexus-accent)' },
        ].map((stat) => (
          <div key={stat.label} className="nexus-card" style={{ padding: 20 }}>
            <div className="kpi-label">{stat.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'var(--font-display)', color: stat.color, marginTop: 4 }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--nexus-text-muted)' }} />
          <input
            className="nexus-input"
            placeholder="Search spaces..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 40 }}
          />
        </div>
        <button className="btn-secondary"><Filter size={16} /> Filter</button>
        <button className="btn-secondary"><Map size={16} /> Map View</button>
      </div>

      {/* Hierarchy */}
      <HierarchyNavigator
        spaces={filteredSpaces}
        onSelect={setSelectedSpace}
        onReparent={handleReparent}
        onAdd={(parentId) => openAddModal(parentId)}
      />

      {/* Detail Panel */}
      {selectedSpace && (
        <div className="glass-card" style={{ marginTop: 24, padding: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ fontSize: 22, fontWeight: 700 }}>{selectedSpace.name}</h3>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <span className={`badge ${selectedSpace.status === 'occupied' ? 'badge-positive' : selectedSpace.status === 'vacant' ? 'badge-warning' : 'badge-info'}`}>
                  {selectedSpace.status}
                </span>
                <span className="badge badge-neutral">{selectedSpace.type}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn-secondary"
                style={{ fontSize: 13 }}
                onClick={() => openEditModal(selectedSpace)}
              >
                <Pencil size={14} /> Edit
              </button>
              <button
                className="btn-danger"
                style={{ fontSize: 13 }}
                disabled={deleting}
                onClick={() => handleDelete(selectedSpace.id)}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>

          <div className="grid-3" style={{ marginTop: 20 }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--nexus-text-muted)', marginBottom: 4 }}>Area</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{selectedSpace.area_sqft ? `${selectedSpace.area_sqft} sqft` : '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--nexus-text-muted)', marginBottom: 4 }}>Base Rent</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--nexus-accent)' }}>
                {selectedSpace.base_rent ? `$${Number(selectedSpace.base_rent).toLocaleString()}/mo` : '—'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--nexus-text-muted)', marginBottom: 4 }}>Amenities</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {selectedSpace.amenities.length > 0
                  ? selectedSpace.amenities.map(a => (
                    <span key={a} className="badge badge-neutral" style={{ fontSize: 10 }}>{a.replace(/_/g, ' ')}</span>
                  ))
                  : <span style={{ color: 'var(--nexus-text-muted)', fontSize: 14 }}>None</span>
                }
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Space Form Modal (Add / Edit) */}
      {showModal && (
        <SpaceFormModal
          mode={modalMode}
          initialData={modalMode === 'edit' ? selectedSpace || undefined : undefined}
          parentId={modalMode === 'create' ? addParentId : null}
          parentName={modalMode === 'create' ? getParentName() : null}
          onClose={() => setShowModal(false)}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
}
