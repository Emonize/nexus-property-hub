import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

vi.mock('@/lib/actions/auth', () => ({
  getCurrentUser: vi.fn(() => Promise.resolve({ id: 'owner-1', role: 'owner' })),
}));

import { createPaymentForLease, generateMonthlyPayments, updatePaymentStatus, applyLateFee, getPayments, getDashboardKPIs } from '@/lib/actions/payments';

describe('Payment Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'owner-1' } } });
  });

  describe('createPaymentForLease', () => {
    it('returns error when lease is not found', async () => {
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
          }),
        }),
      });

      const result = await createPaymentForLease('fake-lease', '2026-04-01');
      expect(result.error).toBe('Lease not found');
    });

    it('calculates correct split amount', async () => {
      const lease = {
        id: 'lease-1',
        tenant_id: 'tenant-1',
        monthly_rent: 1500,
        split_pct: 40, // 40% of $1500 = $600
      };

      let insertedData: any = null;

      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: lease, error: null }),
          }),
        }),
      });

      mockFrom.mockReturnValueOnce({
        insert: vi.fn().mockImplementation((data: any) => {
          insertedData = data;
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...data, id: 'payment-1' },
                error: null,
              }),
            }),
          };
        }),
      });

      const result = await createPaymentForLease('lease-1', '2026-04-01');
      expect(insertedData.amount).toBe(600); // 1500 * 40 / 100
      expect(insertedData.tenant_id).toBe('tenant-1');
      expect(insertedData.status).toBe('pending');
    });

    it('handles 100% split correctly', async () => {
      const lease = {
        id: 'lease-1',
        tenant_id: 'tenant-1',
        monthly_rent: 2000,
        split_pct: 100,
      };

      let insertedData: any = null;

      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: lease, error: null }),
          }),
        }),
      });

      mockFrom.mockReturnValueOnce({
        insert: vi.fn().mockImplementation((data: any) => {
          insertedData = data;
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...data, id: 'payment-1' },
                error: null,
              }),
            }),
          };
        }),
      });

      await createPaymentForLease('lease-1', '2026-04-01');
      expect(insertedData.amount).toBe(2000);
    });
  });

  describe('generateMonthlyPayments', () => {
    it('creates payments for all active leases', async () => {
      const activeLeases = [
        { id: 'lease-1', tenant_id: 't1', monthly_rent: 1000, split_pct: 100 },
        { id: 'lease-2', tenant_id: 't2', monthly_rent: 1500, split_pct: 50 },
        { id: 'lease-3', tenant_id: 't3', monthly_rent: 1500, split_pct: 50 },
      ];

      let insertedPayments: any[] = [];

      // Query active leases
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: activeLeases, error: null }),
        }),
      });

      // Insert payments
      mockFrom.mockReturnValueOnce({
        insert: vi.fn().mockImplementation((data: any) => {
          insertedPayments = data;
          return {
            select: vi.fn().mockResolvedValue({ data, error: null }),
          };
        }),
      });

      const result = await generateMonthlyPayments();
      expect(result.count).toBe(3);
      expect(insertedPayments).toHaveLength(3);

      // Verify split math
      expect(insertedPayments[0].amount).toBe(1000); // 1000 * 100%
      expect(insertedPayments[1].amount).toBe(750);  // 1500 * 50%
      expect(insertedPayments[2].amount).toBe(750);  // 1500 * 50%

      // All should be pending
      insertedPayments.forEach(p => expect(p.status).toBe('pending'));
    });

    it('returns error when no active leases', async () => {
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'Query failed' } }),
        }),
      });

      const result = await generateMonthlyPayments();
      expect(result.error).toBeDefined();
    });
  });

  describe('updatePaymentStatus', () => {
    it('sets paid_date when status is paid', async () => {
      let updatedData: any = null;

      mockFrom.mockReturnValueOnce({
        update: vi.fn().mockImplementation((data: any) => {
          updatedData = data;
          return {
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'p1', status: 'paid', ...data },
                  error: null,
                }),
              }),
            }),
          };
        }),
      });

      await updatePaymentStatus('p1', 'paid');
      expect(updatedData.paid_date).toBeDefined();
      expect(updatedData.status).toBe('paid');
    });

    it('does not set paid_date for non-paid statuses', async () => {
      let updatedData: any = null;

      mockFrom.mockReturnValueOnce({
        update: vi.fn().mockImplementation((data: any) => {
          updatedData = data;
          return {
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'p1', ...data },
                  error: null,
                }),
              }),
            }),
          };
        }),
      });

      await updatePaymentStatus('p1', 'failed');
      expect(updatedData.paid_date).toBeUndefined();
      expect(updatedData.status).toBe('failed');
    });

    it('stores stripe payment ID when provided', async () => {
      let updatedData: any = null;

      mockFrom.mockReturnValueOnce({
        update: vi.fn().mockImplementation((data: any) => {
          updatedData = data;
          return {
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'p1', ...data },
                  error: null,
                }),
              }),
            }),
          };
        }),
      });

      await updatePaymentStatus('p1', 'paid', 'pi_stripe_123');
      expect(updatedData.stripe_payment_id).toBe('pi_stripe_123');
    });
  });

  describe('applyLateFee', () => {
    it('applies the late fee and adds a note', async () => {
      let updatedData: any = null;

      mockFrom.mockReturnValueOnce({
        update: vi.fn().mockImplementation((data: any) => {
          updatedData = data;
          return {
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'p1', ...data },
                  error: null,
                }),
              }),
            }),
          };
        }),
      });

      await applyLateFee('p1', 50);
      expect(updatedData.late_fee).toBe(50);
      expect(updatedData.notes).toContain('Late fee of $50');
    });
  });

  describe('getPayments - RBAC', () => {
    it('restricts tenants to their own payments', async () => {
      const { getCurrentUser } = await import('@/lib/actions/auth');
      vi.mocked(getCurrentUser).mockResolvedValueOnce({ id: 'tenant-1', role: 'tenant' } as any);

      const mockEq = vi.fn().mockResolvedValue({ data: [], error: null });
      const mockOrder = vi.fn().mockReturnValue({ eq: mockEq });

      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          order: mockOrder,
        }),
      });

      await getPayments();
      // Should have called eq with tenant_id filter
      expect(mockEq).toHaveBeenCalledWith('tenant_id', 'tenant-1');
    });

    it('returns empty for vendors', async () => {
      const { getCurrentUser } = await import('@/lib/actions/auth');
      vi.mocked(getCurrentUser).mockResolvedValueOnce({ id: 'vendor-1', role: 'vendor' } as any);

      const mockLimit = vi.fn().mockResolvedValue({ data: [], error: null });
      const mockEqVoid = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockOrder = vi.fn().mockReturnValue({ eq: mockEqVoid });

      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          order: mockOrder,
        }),
      });

      const result = await getPayments();
      // Should use void filter to return empty
      expect(mockEqVoid).toHaveBeenCalledWith('id', 'void');
    });
  });

  describe('getDashboardKPIs - RBAC', () => {
    it('returns zero KPIs for tenants', async () => {
      const { getCurrentUser } = await import('@/lib/actions/auth');
      vi.mocked(getCurrentUser).mockResolvedValueOnce({ id: 'tenant-1', role: 'tenant' } as any);

      const result = await getDashboardKPIs();
      expect(result.data?.totalCashFlow).toBe(0);
      expect(result.data?.collectionRate).toBe(0);
      expect(result.data?.urgentRepairs).toBe(0);
    });

    it('returns zero KPIs for vendors', async () => {
      const { getCurrentUser } = await import('@/lib/actions/auth');
      vi.mocked(getCurrentUser).mockResolvedValueOnce({ id: 'vendor-1', role: 'vendor' } as any);

      const result = await getDashboardKPIs();
      expect(result.data?.totalCashFlow).toBe(0);
      expect(result.data?.cashFlowTrend).toEqual([]);
    });
  });
});
