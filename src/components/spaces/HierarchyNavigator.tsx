'use client';

import { useState, useCallback } from 'react';
import {
  Building2,
  Home,
  DoorOpen,
  Car,
  Monitor,
  Package,
  ChevronRight,
  ChevronDown,
  GripVertical,
  Plus,
  DollarSign,
} from 'lucide-react';
import type { Space, SpaceType } from '@/types/database';

interface HierarchyNavigatorProps {
  spaces: Space[];
  onReparent?: (spaceId: string, newParentId: string | null) => void;
  onSelect?: (space: Space) => void;
  onAdd?: (parentId: string | null) => void;
}

const typeIcons: Record<SpaceType, typeof Building2> = {
  building: Building2,
  home: Home,
  unit: Home,
  room: DoorOpen,
  garage: Car,
  desk: Monitor,
  storage: Package,
  lot: Package,
  other: Package,
};

const typeClasses: Record<SpaceType, string> = {
  building: 'tree-node-building',
  home: 'tree-node-building',
  unit: 'tree-node-unit',
  room: 'tree-node-room',
  garage: 'tree-node-garage',
  desk: 'tree-node-unit',
  storage: 'tree-node-garage',
  lot: 'tree-node-garage',
  other: 'tree-node-unit',
};

const statusBadgeMap: Record<string, string> = {
  occupied: 'badge-positive',
  vacant: 'badge-warning',
  maintenance: 'badge-critical',
  listed: 'badge-info',
  unlisted: 'badge-neutral',
};

function buildTree(spaces: Space[]): (Space & { children: Space[] })[] {
  const map = new Map<string, Space & { children: Space[] }>();
  const roots: (Space & { children: Space[] })[] = [];

  spaces.forEach((s) => {
    map.set(s.id, { ...s, children: [] });
  });

  spaces.forEach((s) => {
    const node = map.get(s.id)!;
    if (s.parent_id && map.has(s.parent_id)) {
      map.get(s.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

function SpaceNode({
  space,
  depth,
  onSelect,
  onAdd,
  dragHandlers,
}: {
  space: Space & { children: Space[] };
  depth: number;
  onSelect?: (space: Space) => void;
  onAdd?: (parentId: string | null) => void;
  dragHandlers: {
    onDragStart: (e: React.DragEvent, id: string) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent, targetId: string) => void;
  };
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const Icon = typeIcons[space.type] || Package;
  const hasChildren = space.children.length > 0;

  return (
    <div>
      <div
        className="tree-node"
        style={{ paddingLeft: depth * 24 + 12 }}
        draggable
        onDragStart={(e) => dragHandlers.onDragStart(e, space.id)}
        onDragOver={dragHandlers.onDragOver}
        onDrop={(e) => dragHandlers.onDrop(e, space.id)}
      >
        <GripVertical size={14} style={{ color: 'var(--nexus-text-muted)', cursor: 'grab', opacity: 0.5 }} />

        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--nexus-text-muted)',
            padding: 0,
            width: 16,
            height: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            visibility: hasChildren ? 'visible' : 'hidden',
          }}
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        <div className={`tree-node-icon ${typeClasses[space.type]}`}>
          <Icon size={14} />
        </div>

        <div
          style={{ flex: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
          onClick={() => onSelect?.(space)}
        >
          <span style={{ fontWeight: 500 }} className={space.status === 'vacant' ? 'vacant-pulse' : ''}>
            {space.name}
          </span>
          <span className={`badge ${statusBadgeMap[space.status] || 'badge-neutral'}`} style={{ fontSize: 10, padding: '2px 6px' }}>
            {space.status}
          </span>
        </div>

        {space.base_rent && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 13, color: 'var(--nexus-accent)', fontWeight: 600, fontFamily: 'var(--font-display)' }}>
            <DollarSign size={13} />
            {Number(space.base_rent).toLocaleString()}
          </div>
        )}

        <button
          onClick={() => onAdd?.(space.id)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--nexus-text-muted)',
            padding: 4,
            borderRadius: 4,
            opacity: 0.5,
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.5')}
          title="Add child space"
        >
          <Plus size={14} />
        </button>
      </div>

      {expanded && hasChildren && (
        <div>
          {space.children.map((child) => (
            <SpaceNode
              key={child.id}
              space={child as Space & { children: Space[] }}
              depth={depth + 1}
              onSelect={onSelect}
              onAdd={onAdd}
              dragHandlers={dragHandlers}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function HierarchyNavigator({ spaces, onReparent, onSelect, onAdd }: HierarchyNavigatorProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const tree = buildTree(spaces);

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (draggedId && draggedId !== targetId) {
      onReparent?.(draggedId, targetId);
    }
    setDraggedId(null);
  }, [draggedId, onReparent]);

  const dragHandlers = { onDragStart: handleDragStart, onDragOver: handleDragOver, onDrop: handleDrop };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Property Hierarchy</h2>
          <p style={{ fontSize: 13, color: 'var(--nexus-text-secondary)', marginTop: 4 }}>
            Drag to reparent • Click to inspect • {spaces.length} spaces
          </p>
        </div>
        <button className="btn-primary" style={{ padding: '8px 16px', fontSize: 13 }} onClick={() => onAdd?.(null)}>
          <Plus size={14} />
          Add Property
        </button>
      </div>

      <div style={{
        background: 'var(--nexus-bg-card)',
        border: '1px solid var(--nexus-border)',
        borderRadius: 'var(--nexus-radius-lg)',
        padding: '8px 0',
        maxHeight: 500,
        overflowY: 'auto',
      }}>
        {tree.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 24px', color: 'var(--nexus-text-muted)' }}>
            <Building2 size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
            <div>No properties yet. Add your first property to get started.</div>
          </div>
        ) : (
          tree.map((root) => (
            <SpaceNode
              key={root.id}
              space={root}
              depth={0}
              onSelect={onSelect}
              onAdd={onAdd}
              dragHandlers={dragHandlers}
            />
          ))
        )}
      </div>
    </div>
  );
}
