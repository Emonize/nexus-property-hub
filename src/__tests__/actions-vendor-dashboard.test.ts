import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    from: mockFrom,
  })),
}));

const mockGetCurrentUser = vi.fn();
vi.mock('@/lib/actions/auth', () => ({
  getCurrentUser: (...args: any[]) => mockGetCurrentUser(...args),
}));

import { getVendorDashboardData } from '@/lib/actions/vendor-dashboard';

function buildChain(result: { data: any; error: any }) {
  const chain: any = {};
  const methods = ['select', 'eq', 'in', 'order', 'limit', 'gte', 'lte', 'lt', 'ilike', 'single'];
  for (const m of methods) {
    if (m === 'single') {
      chain[m] = vi.fn().mockResolvedValue(result);
    } else {
      chain[m] = vi.fn().mockReturnValue(chain);
    }
  }
  chain.then = (resolve: (v: any) => void) => resolve(result);
  return chain;
}

describe('getVendorDashboardData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue({ id: 'vendor-1', role: 'vendor' });
  });

  it('returns empty data for non-vendor users', async () => {
    mockGetCurrentUser.mockResolvedValueOnce({ id: 'tenant-1', role: 'tenant' });

    const result = await getVendorDashboardData();
    expect(result.kpis.assignedTickets).toBe(0);
    expect(result.assignedTickets).toEqual([]);
    expect(result.recentlyCompleted).toEqual([]);
  });

  it('returns empty data when not authenticated', async () => {
    mockGetCurrentUser.mockResolvedValueOnce(null);

    const result = await getVendorDashboardData();
    expect(result.kpis.assignedTickets).toBe(0);
  });

  it('populates KPIs from active and completed tickets', async () => {
    const activeTickets = [
      {
        id: 't1', title: 'Fix pipe', description: 'Leaking pipe', priority: 1,
        status: 'vendor_assigned', ai_severity: 'high', ai_category: 'plumbing',
        ai_cost_estimate: 280, created_at: '2026-04-01T10:00:00Z',
        space: { name: 'Unit 3A' }, reporter: { full_name: 'John Doe' },
      },
      {
        id: 't2', title: 'Replace outlet', description: null, priority: 2,
        status: 'in_progress', ai_severity: 'medium', ai_category: 'electrical',
        ai_cost_estimate: 150, created_at: '2026-04-02T14:00:00Z',
        space: { name: 'Room 1B' }, reporter: { full_name: 'Jane Smith' },
      },
    ];

    const completedTickets = [
      {
        id: 't3', title: 'Fixed AC', description: 'Replaced filter', priority: 3,
        status: 'resolved', ai_severity: 'medium', ai_category: 'hvac',
        ai_cost_estimate: 200, created_at: '2026-04-01T08:00:00Z',
        resolved_at: '2026-04-01T16:00:00Z', // 8 hours resolution
        space: { name: 'Unit 5' }, reporter: { full_name: 'Bob' },
      },
    ];

    mockFrom
      .mockReturnValueOnce(buildChain({ data: activeTickets, error: null }))
      .mockReturnValueOnce(buildChain({ data: completedTickets, error: null }));

    const result = await getVendorDashboardData();

    expect(result.kpis.assignedTickets).toBe(2);
    expect(result.kpis.inProgress).toBe(1);
    expect(result.kpis.completedThisMonth).toBe(1);
    expect(result.kpis.avgResolutionHours).toBe(8);
  });

  it('maps ticket data correctly', async () => {
    const ticket = {
      id: 't1', title: 'Fix faucet', description: 'Kitchen faucet leaking',
      priority: 2, status: 'vendor_assigned', ai_severity: 'high',
      ai_category: 'plumbing', ai_cost_estimate: 180,
      created_at: '2026-04-01T10:00:00Z',
      space: { name: 'Apt 4B' }, reporter: { full_name: 'Alice' },
    };

    mockFrom
      .mockReturnValueOnce(buildChain({ data: [ticket], error: null }))
      .mockReturnValueOnce(buildChain({ data: [], error: null }));

    const result = await getVendorDashboardData();

    expect(result.assignedTickets).toHaveLength(1);
    const mapped = result.assignedTickets[0];
    expect(mapped.id).toBe('t1');
    expect(mapped.title).toBe('Fix faucet');
    expect(mapped.spaceName).toBe('Apt 4B');
    expect(mapped.severity).toBe('high');
    expect(mapped.category).toBe('plumbing');
    expect(mapped.costEstimate).toBe(180);
    expect(mapped.reporterName).toBe('Alice');
  });

  it('handles no active tickets gracefully', async () => {
    mockFrom
      .mockReturnValueOnce(buildChain({ data: [], error: null }))
      .mockReturnValueOnce(buildChain({ data: [], error: null }));

    const result = await getVendorDashboardData();

    expect(result.kpis.assignedTickets).toBe(0);
    expect(result.kpis.inProgress).toBe(0);
    expect(result.kpis.avgResolutionHours).toBeNull();
    expect(result.assignedTickets).toEqual([]);
  });

  it('calculates avg resolution from multiple completed tickets', async () => {
    const completedTickets = [
      {
        id: 'c1', title: 'A', description: null, priority: 3,
        status: 'resolved', ai_severity: 'low', ai_category: 'general',
        ai_cost_estimate: null,
        created_at: '2026-04-01T08:00:00Z', resolved_at: '2026-04-01T12:00:00Z', // 4h
        space: { name: 'X' }, reporter: { full_name: 'R' },
      },
      {
        id: 'c2', title: 'B', description: null, priority: 3,
        status: 'closed', ai_severity: 'low', ai_category: 'general',
        ai_cost_estimate: null,
        created_at: '2026-04-02T10:00:00Z', resolved_at: '2026-04-03T10:00:00Z', // 24h
        space: { name: 'Y' }, reporter: { full_name: 'S' },
      },
    ];

    mockFrom
      .mockReturnValueOnce(buildChain({ data: [], error: null }))
      .mockReturnValueOnce(buildChain({ data: completedTickets, error: null }));

    const result = await getVendorDashboardData();

    // (4 + 24) / 2 = 14.0
    expect(result.kpis.avgResolutionHours).toBe(14);
    expect(result.kpis.completedThisMonth).toBe(2);
  });
});
