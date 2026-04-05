/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Supabase mock ---
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockEq = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(() => Promise.resolve({
    from: mockFrom,
  })),
  createClient: vi.fn(() => Promise.resolve({
    from: mockFrom,
  })),
}));

import { GET } from '@/app/api/cron/generate-payments/route';

function makeRequest(cronSecret?: string) {
  const headers = new Headers();
  if (cronSecret) headers.set('authorization', `Bearer ${cronSecret}`);
  return new Request('http://localhost:3000/api/cron/generate-payments', { headers }) as any;
}

describe('Cron: Generate Monthly Payments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = 'test-cron-secret';
  });

  it('rejects unauthorized requests', async () => {
    const response = await GET(makeRequest('wrong-secret'));
    expect(response.status).toBe(401);
  });

  it('rejects requests with no auth header', async () => {
    const response = await GET(makeRequest());
    expect(response.status).toBe(401);
  });

  it('generates payments for active leases', async () => {
    const activeLeases = [
      { id: 'lease-1', tenant_id: 't1', monthly_rent: 1000, split_pct: 100, payment_day: 1, space_id: 's1', split_group_id: null },
      { id: 'lease-2', tenant_id: 't2', monthly_rent: 1500, split_pct: 60, payment_day: 15, space_id: 's2', split_group_id: 'grp-1' },
      { id: 'lease-3', tenant_id: 't3', monthly_rent: 1500, split_pct: 40, payment_day: 15, space_id: 's2', split_group_id: 'grp-1' },
    ];

    let insertedPayments: any[] = [];

    // First from('leases') call — fetch active leases
    const leasesChain = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: activeLeases, error: null }),
      }),
    };

    // Second from('rent_payments') call — check existing payments
    const existingChain = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }), // no duplicates
      }),
    };

    // Third from('rent_payments') call — insert new payments
    const insertChain = {
      insert: vi.fn().mockImplementation((data: any) => {
        insertedPayments = data;
        return {
          select: vi.fn().mockResolvedValue({
            data: data.map((d: any, i: number) => ({ ...d, id: `pay-${i}` })),
            error: null,
          }),
        };
      }),
    };

    mockFrom
      .mockReturnValueOnce(leasesChain)
      .mockReturnValueOnce(existingChain)
      .mockReturnValueOnce(insertChain);

    const response = await GET(makeRequest('test-cron-secret'));
    const body = await response.json();

    expect(body.generated).toBe(3);
    expect(body.skipped).toBe(0);

    // Verify split math
    expect(insertedPayments[0].amount).toBe(1000);  // 1000 * 100%
    expect(insertedPayments[1].amount).toBe(900);    // 1500 * 60%
    expect(insertedPayments[2].amount).toBe(600);    // 1500 * 40%

    // All should be pending
    insertedPayments.forEach(p => expect(p.status).toBe('pending'));
  });

  it('skips leases that already have payments for this month', async () => {
    const activeLeases = [
      { id: 'lease-1', tenant_id: 't1', monthly_rent: 1000, split_pct: 100, payment_day: 1, space_id: 's1' },
      { id: 'lease-2', tenant_id: 't2', monthly_rent: 2000, split_pct: 100, payment_day: 1, space_id: 's2' },
    ];

    let insertedPayments: any[] = [];

    mockFrom
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: activeLeases, error: null }),
        }),
      })
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [{ lease_id: 'lease-1' }], // lease-1 already has payment
            error: null,
          }),
        }),
      })
      .mockReturnValueOnce({
        insert: vi.fn().mockImplementation((data: any) => {
          insertedPayments = data;
          return {
            select: vi.fn().mockResolvedValue({
              data: data.map((d: any) => ({ ...d, id: 'new-pay' })),
              error: null,
            }),
          };
        }),
      });

    const response = await GET(makeRequest('test-cron-secret'));
    const body = await response.json();

    expect(body.generated).toBe(1);
    expect(body.skipped).toBe(1);
    expect(insertedPayments).toHaveLength(1);
    expect(insertedPayments[0].lease_id).toBe('lease-2');
  });

  it('returns message when no payments need generating', async () => {
    mockFrom
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [{ id: 'lease-1', tenant_id: 't1', monthly_rent: 1000, split_pct: 100, payment_day: 1 }], error: null }),
        }),
      })
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [{ lease_id: 'lease-1' }],
            error: null,
          }),
        }),
      });

    const response = await GET(makeRequest('test-cron-secret'));
    const body = await response.json();

    expect(body.message).toContain('No new payments');
  });
});
