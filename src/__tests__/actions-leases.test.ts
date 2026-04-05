/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    auth: { getUser: mockGetUser },
    from: mockFrom,
    rpc: mockRpc,
  })),
}));

vi.mock('@/lib/actions/auth', () => ({
  getCurrentUser: vi.fn(() => Promise.resolve({ id: 'owner-1', role: 'owner' })),
}));

import { createLease, updateLeaseStatus, getLeases } from '@/lib/actions/leases';

describe('Lease Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'owner-1' } } });
  });

  describe('createLease', () => {
    it('returns error when not authenticated', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } });

      const result = await createLease({
        space_id: 'space-1',
        tenant_id: 'tenant-1',
        start_date: '2026-04-01',
        monthly_rent: 1200,
      });
      expect(result.error).toBe('Unauthorized');
    });

    it('creates a lease and marks space as occupied', async () => {
      const newLease = {
        id: 'lease-1',
        space_id: 'space-1',
        tenant_id: 'tenant-1',
        monthly_rent: 1200,
        split_pct: 100,
        status: 'pending',
      };

      // First call: check existing leases on the space
      const existingLeasesQuery = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      };

      // Second call: insert the lease
      const insertQuery = {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: newLease, error: null }),
          }),
        }),
      };

      // Third call: update space status to occupied
      const updateSpaceQuery = {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      };

      mockFrom
        .mockReturnValueOnce(existingLeasesQuery)  // leases check
        .mockReturnValueOnce(insertQuery)           // lease insert
        .mockReturnValueOnce(updateSpaceQuery);     // spaces update

      const result = await createLease({
        space_id: 'space-1',
        tenant_id: 'tenant-1',
        start_date: '2026-04-01',
        monthly_rent: 1200,
      });

      expect(result.data).toEqual(newLease);
    });

    it('rejects split percentages exceeding 100%', async () => {
      // Existing lease already has 80% split
      const existingLeasesQuery = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [{ id: 'lease-existing', split_pct: 80, split_group_id: 'group-1' }],
              error: null,
            }),
          }),
        }),
      };

      mockFrom.mockReturnValueOnce(existingLeasesQuery);

      const result = await createLease({
        space_id: 'space-1',
        tenant_id: 'tenant-2',
        start_date: '2026-04-01',
        monthly_rent: 1200,
        split_pct: 30, // 80 + 30 = 110 > 100
      });

      expect(result.error).toContain('Split percentages exceed 100%');
    });

    it('auto-assigns split group when adding to occupied space', async () => {
      const existingLeasesQuery = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [{ id: 'lease-existing', split_pct: 60, split_group_id: null }],
              error: null,
            }),
          }),
        }),
      };

      // Update existing lease with split_group_id
      const updateExistingQuery = {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      };

      const insertQuery = {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'lease-2', split_group_id: 'some-uuid', split_pct: 40 },
              error: null,
            }),
          }),
        }),
      };

      const updateSpaceQuery = {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      };

      mockFrom
        .mockReturnValueOnce(existingLeasesQuery)
        .mockReturnValueOnce(updateExistingQuery)   // updating existing lease with group id
        .mockReturnValueOnce(insertQuery)
        .mockReturnValueOnce(updateSpaceQuery);

      const result = await createLease({
        space_id: 'space-1',
        tenant_id: 'tenant-2',
        start_date: '2026-04-01',
        monthly_rent: 1200,
        split_pct: 40,
      });

      expect(result.data?.split_group_id).toBeDefined();
    });
  });

  describe('updateLeaseStatus', () => {
    it('sets space to vacant when last active lease is terminated', async () => {
      const terminatedLease = {
        id: 'lease-1',
        space_id: 'space-1',
        status: 'terminated',
      };

      // First: update the lease
      mockFrom.mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: terminatedLease, error: null }),
            }),
          }),
        }),
      });

      // Second: check remaining active leases on the space
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      });

      // Third: update space status to vacant
      const mockSpaceUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      mockFrom.mockReturnValueOnce({
        update: mockSpaceUpdate,
      });

      const result = await updateLeaseStatus('lease-1', 'terminated');
      expect(result.data).toEqual(terminatedLease);
      // The space update should have been called
      expect(mockFrom).toHaveBeenCalledWith('spaces');
    });
  });

  describe('getLeases - RBAC', () => {
    it('blocks vendors from accessing leases', async () => {
      const { getCurrentUser } = await import('@/lib/actions/auth');
      vi.mocked(getCurrentUser).mockResolvedValueOnce({ id: 'vendor-1', role: 'vendor' } as any);

      const result = await getLeases();
      expect(result.error).toContain('Unauthorized');
      expect(result.data).toEqual([]);
    });
  });
});
