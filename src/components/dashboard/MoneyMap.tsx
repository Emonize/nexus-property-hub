'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

interface TreemapData {
  id: string;
  name: string;
  type: string;
  rent: number;
  status: 'paid' | 'pending' | 'overdue' | 'vacant';
}

interface MoneyMapProps {
  spaces: TreemapData[];
}

const statusColors: Record<string, string> = {
  paid: '#34A853',
  pending: '#FBBC04',
  overdue: '#EA4335',
  vacant: '#3A3A4A',
};

export default function MoneyMap({ spaces }: MoneyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; data: TreemapData } | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!containerRef.current || spaces.length === 0) return;

    const renderTreemap = async () => {
      const d3 = await import('d3');
      const container = containerRef.current!;
      const width = container.clientWidth;
      const height = 400;

      d3.select(container).selectAll('svg').remove();

      const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const root = d3.hierarchy<any>({ children: spaces.map(s => ({ ...s, value: Math.max(s.rent, 100) })) })
        .sum((d) => d.value || 0)
        .sort((a, b) => (b.value || 0) - (a.value || 0));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      d3.treemap<any>()
        .size([width, height])
        .padding(3)
        .round(true)(root);

      const leaves = root.leaves();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tiles = svg.selectAll<SVGGElement, any>('g')
        .data(leaves)
        .join('g')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .attr('transform', (d: any) => `translate(${d.x0},${d.y0})`);

      tiles.append('rect')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .attr('width', (d: any) => d.x1 - d.x0)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .attr('height', (d: any) => d.y1 - d.y0)
        .attr('rx', 6)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .attr('fill', (d: any) => statusColors[d.data.status] || statusColors.vacant)
        .attr('opacity', 0.85)
        .style('cursor', 'pointer')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .on('mouseenter', function (event: MouseEvent, d: any) {
          d3.select(this).attr('opacity', 1).attr('stroke', '#6C63FF').attr('stroke-width', 2);
          setTooltip({ x: event.clientX, y: event.clientY, data: d.data as TreemapData });
        })
        .on('mouseleave', function () {
          d3.select(this).attr('opacity', 0.85).attr('stroke', 'none');
          setTooltip(null);
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .on('click', (_: MouseEvent, d: any) => {
          router.push(`/spaces/${d.data.id}`);
        });

      tiles.append('text')
        .attr('x', 8)
        .attr('y', 20)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .text((d: any) => d.x1 - d.x0 > 60 ? d.data.name : '')
        .attr('fill', 'white')
        .attr('font-size', '12px')
        .attr('font-weight', '600')
        .attr('font-family', 'Inter, sans-serif')
        .style('pointer-events', 'none');

      tiles.append('text')
        .attr('x', 8)
        .attr('y', 36)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .text((d: any) => d.x1 - d.x0 > 80 ? `$${d.data.rent}/mo` : '')
        .attr('fill', 'rgba(255,255,255,0.7)')
        .attr('font-size', '11px')
        .attr('font-family', 'Inter, sans-serif')
        .style('pointer-events', 'none');
    };

    renderTreemap();
  }, [spaces, router]);

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Money Map</h2>
          <p style={{ fontSize: 13, color: 'var(--nexus-text-secondary)', marginTop: 4 }}>
            Revenue by space — sized by rent, colored by payment status
          </p>
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
          {Object.entries(statusColors).filter(([k]) => k !== 'vacant').map(([status, color]) => (
            <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: color }} />
              <span style={{ color: 'var(--nexus-text-secondary)', textTransform: 'capitalize' }}>{status}</span>
            </div>
          ))}
        </div>
      </div>
      <div ref={containerRef} className="treemap-container" />

      {tooltip && (
        <div style={{
          position: 'fixed',
          left: tooltip.x + 12,
          top: tooltip.y - 40,
          background: 'var(--nexus-bg-card)',
          border: '1px solid var(--nexus-border)',
          borderRadius: 'var(--nexus-radius-sm)',
          padding: '10px 14px',
          fontSize: 13,
          zIndex: 100,
          pointerEvents: 'none',
          boxShadow: 'var(--nexus-shadow-lg)',
        }}>
          <div style={{ fontWeight: 600 }}>{tooltip.data.name}</div>
          <div style={{ color: 'var(--nexus-text-secondary)', marginTop: 2 }}>
            ${tooltip.data.rent}/mo · <span style={{ color: statusColors[tooltip.data.status], textTransform: 'capitalize' }}>{tooltip.data.status}</span>
          </div>
        </div>
      )}
    </div>
  );
}
