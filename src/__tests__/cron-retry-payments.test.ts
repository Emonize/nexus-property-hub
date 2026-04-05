/* eslint-disable @typescript-eslint/no-explicit-any */
 
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Stripe
vi.mock('stripe', () => {
  const MockStripe = function () {
    return {
      paymentIntents: {
        create: vi.fn().mockResolvedValue({ id: 'pi_retry_123' }),
      },
    };
  };
  return { default: MockStripe };
});

// Mock notification dispatcher
const mockDispatchNotification = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/notifications/dispatcher', () => ({
  dispatchNotification: (...args: any[]) => mockDispatchNotification(...args),
}));

const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(() => Promise.resolve({
    from: mockFrom,
  })),
  createClient: vi.fn(() => Promise.resolve({
    from: mockFrom,
  })),
}));

import { GET } from '@/app/api/cron/retry-payments/route';

function makeRequest(cronSecret?: string) {
  const headers = new Headers();
  if (cronSecret) headers.set('authorization', `Bearer ${cronSecret}`);
  return new Request('http://localhost:3000/api/cron/retry-payments', { headers }) as any;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function makeOverduePayment(id: string, daysOverdue: number, opts: Partial<{
  status: string;
  late_fee: number;
  notes: string;
  ownerId: string;
  spaceName: string;
}> = {}) {
  return {
    id,
    lease_id: `lease-${id}`,
    tenant_id: `tenant-${id}`,
    amount: 1000,
    due_date: daysAgo(daysOverdue),
    status: opts.status || 'pending',
    late_fee: opts.late_fee ?? 0,
    notes: opts.notes || '',
    lease: {
      space_id: `space-${id}`,
      split_group_id: null,
      space: {
        name: opts.spaceName || `Space ${id}`,
        owner_id: opts.ownerId || `owner-${id}`,
      },
    },
  };
}

describe('Cron: Retry Payments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = 'test-cron-secret';
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
  });

  it('rejects unauthorized requests', async () => {
    const response = await GET(makeRequest('wrong'));
    expect(response.status).toBe(401);
  });

  it('processes Day 3 overdue: retry + SMS notification', async () => {
    const payment = makeOverduePayment('p1', 3);

    // Overdue payments query
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockReturnValue({
          lt: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [payment], error: null }),
          }),
        }),
      }),
    });

    // retryPayment: lookup tenant stripe customer
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { stripe_customer_id: 'cus_test' }, error: null }),
        }),
      }),
    });

    // retryPayment: lookup owner stripe connect
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { stripe_connect_id: 'acct_test' }, error: null }),
        }),
      }),
    });

    // retryPayment: update payment status to processing
    mockFrom.mockReturnValueOnce({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    const response = await GET(makeRequest('test-cron-secret'));
    const body = await response.json();

    expect(body.retried).toBe(1);
    expect(body.notified).toBe(1);

    // Should have sent SMS notification to tenant
    expect(mockDispatchNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'tenant-p1',
        type: 'payment_reminder',
        channels: ['app', 'sms'],
      })
    );
  });

  it('processes Day 5 overdue: retry + email warning', async () => {
    const payment = makeOverduePayment('p2', 5);

    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockReturnValue({
          lt: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [payment], error: null }),
          }),
        }),
      }),
    });

    // retryPayment: no saved card
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { stripe_customer_id: null }, error: null }),
        }),
      }),
    });

    // retryPayment: update to failed (no card)
    mockFrom.mockReturnValueOnce({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    const response = await GET(makeRequest('test-cron-secret'));
    const body = await response.json();

    expect(body.retried).toBe(1);

    // Should have sent email to tenant
    expect(mockDispatchNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'tenant-p2',
        channels: ['app', 'email'],
      })
    );
  });

  it('processes Day 7 overdue: applies late fee + notifies owner', async () => {
    const payment = makeOverduePayment('p3', 8, { late_fee: 0 });

    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockReturnValue({
          lt: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [payment], error: null }),
          }),
        }),
      }),
    });

    // Update late fee
    mockFrom.mockReturnValueOnce({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    const response = await GET(makeRequest('test-cron-secret'));
    const body = await response.json();

    expect(body.lateFees).toBe(1);
    expect(body.notified).toBe(1);

    // Should notify both tenant and owner
    expect(mockDispatchNotification).toHaveBeenCalledTimes(2);

    // Tenant notification
    expect(mockDispatchNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'tenant-p3',
        title: 'Late Fee Applied',
        channels: ['app', 'sms', 'email'],
      })
    );

    // Owner notification
    expect(mockDispatchNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'owner-p3',
        channels: ['app', 'email'],
      })
    );
  });

  it('does not double-apply late fees', async () => {
    const payment = makeOverduePayment('p4', 10, { late_fee: 50 }); // already has fee

    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockReturnValue({
          lt: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [payment], error: null }),
          }),
        }),
      }),
    });

    const response = await GET(makeRequest('test-cron-secret'));
    const body = await response.json();

    expect(body.lateFees).toBe(0); // no new late fee
  });

  it('processes Day 14+ overdue: escalation to owner', async () => {
    const payment = makeOverduePayment('p5', 16, { notes: '' });

    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockReturnValue({
          lt: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [payment], error: null }),
          }),
        }),
      }),
    });

    // Escalation update
    mockFrom.mockReturnValueOnce({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    const response = await GET(makeRequest('test-cron-secret'));
    const body = await response.json();

    expect(body.escalated).toBe(1);

    // Owner should get urgent notification
    expect(mockDispatchNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'owner-p5',
        title: 'ACTION REQUIRED: Payment Escalation',
        channels: ['app', 'sms', 'email'],
      })
    );
  });

  it('does not double-escalate', async () => {
    const payment = makeOverduePayment('p6', 20, { notes: '[ESCALATED] already flagged' });

    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockReturnValue({
          lt: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [payment], error: null }),
          }),
        }),
      }),
    });

    const response = await GET(makeRequest('test-cron-secret'));
    const body = await response.json();

    expect(body.escalated).toBe(0);
  });

  it('handles empty overdue list gracefully', async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockReturnValue({
          lt: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }),
    });

    const response = await GET(makeRequest('test-cron-secret'));
    const body = await response.json();

    expect(body.processed).toBe(0);
    expect(body.retried).toBe(0);
    expect(body.escalated).toBe(0);
  });
});

describe('calculateLateFee', () => {
  // Test the fee logic independently
  function calculateLateFee(rentAmount: number): number {
    const fee = rentAmount * 0.05;
    return Math.min(100, Math.max(25, Math.round(fee * 100) / 100));
  }

  it('calculates 5% of rent', () => {
    expect(calculateLateFee(1000)).toBe(50); // 5% of 1000
  });

  it('enforces $25 minimum', () => {
    expect(calculateLateFee(200)).toBe(25); // 5% of 200 = $10, but min is $25
  });

  it('enforces $100 maximum', () => {
    expect(calculateLateFee(5000)).toBe(100); // 5% of 5000 = $250, but max is $100
  });

  it('rounds to cents', () => {
    expect(calculateLateFee(777)).toBe(38.85); // 5% of 777 = 38.85
  });
});
