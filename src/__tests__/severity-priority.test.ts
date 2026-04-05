/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect } from 'vitest';
import type { TicketSeverity } from '@/types/database';

// Extracted from src/lib/actions/maintenance.ts
function severityToPriority(severity: TicketSeverity): number {
  const map: Record<TicketSeverity, number> = {
    critical: 1,
    high: 2,
    medium: 3,
    low: 4,
    cosmetic: 5,
  };
  return map[severity] || 3;
}

describe('severityToPriority', () => {
  it('maps critical to priority 1', () => {
    expect(severityToPriority('critical')).toBe(1);
  });

  it('maps high to priority 2', () => {
    expect(severityToPriority('high')).toBe(2);
  });

  it('maps medium to priority 3', () => {
    expect(severityToPriority('medium')).toBe(3);
  });

  it('maps low to priority 4', () => {
    expect(severityToPriority('low')).toBe(4);
  });

  it('maps cosmetic to priority 5', () => {
    expect(severityToPriority('cosmetic')).toBe(5);
  });

  it('defaults to 3 for unknown severity', () => {
    expect(severityToPriority('unknown' as TicketSeverity)).toBe(3);
  });

  it('maintains correct ordering (lower priority number = more urgent)', () => {
    const severities: TicketSeverity[] = ['critical', 'high', 'medium', 'low', 'cosmetic'];
    const priorities = severities.map(severityToPriority);

    for (let i = 0; i < priorities.length - 1; i++) {
      expect(priorities[i]).toBeLessThan(priorities[i + 1]);
    }
  });
});
