/* eslint-disable @typescript-eslint/no-explicit-any */
 
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    from: mockFrom,
  })),
}));

// Mock getCurrentUser — default: tenant
const mockGetCurrentUser = vi.fn();
vi.mock('@/lib/actions/auth', () => ({
  getCurrentUser: (...args: any[]) => mockGetCurrentUser(...args),
}));

import { getTenantDashboardData } from '@/lib/actions/tenant-dashboard';

/**
 * Helper: builds a chainable Supabase query mock.
 * Resolves with `result` at the terminal call (no .single()).
 */
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

  // Make the chain itself thenable for await without .single()
  chain.then = (resolve: (v: any) => void) => resolve(result);

  return chain;
}

describe('getTenantDashboardData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue({ id: 'tenant-1', role: 'tenant' });
  });

  it('returns empty data for non-tenant users', async () => {
    mockGetCurrentUser.mockResolvedValueOnce({ id: 'owner-1', role: 'owner' });

    const result = await getTenantDashboardData();

    expect(result.kpis.nextPayment).toBeNull();
    expect(result.kpis.lease).toBeNull();
    expect(result.actions).toEqual([]);
    expect(result.recentPayments).toEqual([]);
  });

  it('returns empty data when user is not authenticated', async () => {
    mockGetCurrentUser.mockResolvedValueOnce(null);

    const result = await getTenantDashboardData();
    expect(result.kpis.nextPayment).toBeNull();
    expect(result.actions).toEqual([]);
  });

  it('populates KPIs with real payment, ticket, and lease data', async () => {
    const pendingPayment = {
      id: 'pay-1',
      amount: 800,
      due_date: '2026-04-15',
      status: 'pending',
      lease: { space: { name: 'Room 2B' } },
    };

    const openTickets = [
      { id: 't1', title: 'Leaky faucet', status: 'open', ai_severity: 'medium', created_at: '2026-04-01', space: { name: 'Room 2B' } },
      { id: 't2', title: 'Broken window', status: 'in_progress', ai_severity: 'high', created_at: '2026-04-02', space: { name: 'Room 2B' } },
    ];

    const activeLease = {
      id: 'lease-1',
      status: 'active',
      monthly_rent: 1600,
      split_pct: 50,
      end_date: '2027-03-31',
      auto_renew: true,
      space: { name: 'Room 2B' },
    };

    const trustScore = { score: 780 };

    const recentPays = [
      { amount: 800, due_date: '2026-03-01', status: 'paid', lease: { space: { name: 'Room 2B' } } },
      { amount: 800, due_date: '2026-02-01', status: 'paid', lease: { space: { name: 'Room 2B' } } },
    ];

    // 5 parallel queries: payments, tickets, lease, trust, recentPayments
    mockFrom
      .mockReturnValueOnce(buildChain({ data: [pendingPayment], error: null }))     // rent_payments
      .mockReturnValueOnce(buildChain({ data: openTickets, error: null }))           // maintenance_tickets
      .mockReturnValueOnce(buildChain({ data: [activeLease], error: null }))         // leases
      .mockReturnValueOnce(buildChain({ data: trustScore, error: null }))            // trust_scores
      .mockReturnValueOnce(buildChain({ data: recentPays, error: null }));           // rent_payments (recent)

    const result = await getTenantDashboardData();

    // KPI: Next payment
    expect(result.kpis.nextPayment).toEqual({
      amount: 800,
      dueDate: '2026-04-15',
      spaceName: 'Room 2B',
      status: 'pending',
      paymentId: 'pay-1',
    });

    // KPI: Active requests
    expect(result.kpis.activeRequests).toBe(2);

    // KPI: Lease
    expect(result.kpis.lease).toEqual({
      id: 'lease-1',
      status: 'active',
      spaceName: 'Room 2B',
      monthlyRent: 800, // 1600 * 50%
      endDate: '2027-03-31',
      autoRenew: true,
    });

    // KPI: Trust score
    expect(result.kpis.trustScore).toBe(780);

    // Recent payments
    expect(result.recentPayments).toHaveLength(2);
    expect(result.recentPayments[0].status).toBe('paid');
  });

  it('creates action items for maintenance tickets', async () => {
    const openTickets = [
      { id: 't1', title: 'Broken AC', status: 'open', ai_severity: 'critical', created_at: '2026-04-01', space: { name: 'Unit 3' } },
    ];

    mockFrom
      .mockReturnValueOnce(buildChain({ data: [], error: null }))            // payments
      .mockReturnValueOnce(buildChain({ data: openTickets, error: null }))   // tickets
      .mockReturnValueOnce(buildChain({ data: [], error: null }))            // leases
      .mockReturnValueOnce(buildChain({ data: null, error: { message: 'not found' } })) // trust
      .mockReturnValueOnce(buildChain({ data: [], error: null }));           // recent payments

    const result = await getTenantDashboardData();

    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].type).toBe('maintenance');
    expect(result.actions[0].title).toBe('Broken AC');
    expect(result.actions[0].severity).toBe('critical');
  });

  it('creates action item for pending lease', async () => {
    const pendingLease = {
      id: 'lease-2',
      status: 'pending',
      monthly_rent: 1200,
      split_pct: 100,
      end_date: null,
      auto_renew: false,
      space: { name: 'Studio A' },
    };

    mockFrom
      .mockReturnValueOnce(buildChain({ data: [], error: null }))             // payments
      .mockReturnValueOnce(buildChain({ data: [], error: null }))             // tickets
      .mockReturnValueOnce(buildChain({ data: [pendingLease], error: null })) // leases
      .mockReturnValueOnce(buildChain({ data: null, error: { message: 'not found' } })) // trust
      .mockReturnValueOnce(buildChain({ data: [], error: null }));            // recent payments

    const result = await getTenantDashboardData();

    const leaseAction = result.actions.find(a => a.type === 'lease');
    expect(leaseAction).toBeDefined();
    expect(leaseAction!.title).toBe('Lease Pending Signature');
    expect(leaseAction!.cta).toBe('Review');
  });

  it('creates action item for failed payments', async () => {
    const failedPayment = {
      id: 'pay-fail',
      amount: 1500,
      due_date: '2026-04-01',
      status: 'failed',
      lease: { space: { name: 'Apt 5C' } },
    };

    mockFrom
      .mockReturnValueOnce(buildChain({ data: [failedPayment], error: null })) // payments
      .mockReturnValueOnce(buildChain({ data: [], error: null }))              // tickets
      .mockReturnValueOnce(buildChain({ data: [], error: null }))              // leases
      .mockReturnValueOnce(buildChain({ data: null, error: { message: 'not found' } })) // trust
      .mockReturnValueOnce(buildChain({ data: [], error: null }));             // recent payments

    const result = await getTenantDashboardData();

    const payAction = result.actions.find(a => a.type === 'payment');
    expect(payAction).toBeDefined();
    expect(payAction!.title).toContain('Payment Failed');
    expect(payAction!.severity).toBe('critical');
    expect(payAction!.amount).toBe(1500);
  });

  it('computes split rent correctly in lease KPI', async () => {
    const lease = {
      id: 'lease-split',
      status: 'active',
      monthly_rent: 3000,
      split_pct: 33.33,
      end_date: null,
      auto_renew: false,
      space: { name: 'Shared House' },
    };

    mockFrom
      .mockReturnValueOnce(buildChain({ data: [], error: null }))
      .mockReturnValueOnce(buildChain({ data: [], error: null }))
      .mockReturnValueOnce(buildChain({ data: [lease], error: null }))
      .mockReturnValueOnce(buildChain({ data: null, error: { message: 'not found' } }))
      .mockReturnValueOnce(buildChain({ data: [], error: null }));

    const result = await getTenantDashboardData();

    // 3000 * 33.33 / 100 = 999.9
    expect(result.kpis.lease!.monthlyRent).toBeCloseTo(999.9, 1);
  });
});
