/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
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

// Mock fetch for AI triage calls
const originalFetch = global.fetch;
beforeEach(() => {
  global.fetch = vi.fn().mockRejectedValue(new Error('No AI in tests'));
});

import {
  createMaintenanceTicket,
  updateTicketStatus,
  getMaintenanceTickets,
  getActionQueueItems,
} from '@/lib/actions/maintenance';

describe('Maintenance Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
  });

  describe('createMaintenanceTicket', () => {
    it('returns error when not authenticated', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } });

      const result = await createMaintenanceTicket({
        space_id: 'space-1',
        title: 'Broken window',
      });
      expect(result.error).toBe('Unauthorized');
    });

    it('creates ticket with default priority when triage fails', async () => {
      let insertedData: any = null;

      mockFrom.mockReturnValueOnce({
        insert: vi.fn().mockImplementation((data: any) => {
          insertedData = data;
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'ticket-1', ...data },
                error: null,
              }),
            }),
          };
        }),
      });

      const result = await createMaintenanceTicket({
        space_id: 'space-1',
        title: 'Broken window',
        description: 'The window in bedroom 2 is cracked',
      });

      expect(result.data).toBeDefined();
      expect(insertedData.priority).toBe(3); // default when triage fails
      expect(insertedData.ai_severity).toBeNull();
      expect(insertedData.status).toBe('open');
    });

    it('uses AI triage results when available', async () => {
      const triageResult = {
        severity: 'high',
        category: 'structural',
        diy_instructions: '',
        estimated_cost_usd: 400,
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(triageResult),
      } as any);

      let insertedData: any = null;

      mockFrom.mockReturnValueOnce({
        insert: vi.fn().mockImplementation((data: any) => {
          insertedData = data;
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'ticket-1', ...data },
                error: null,
              }),
            }),
          };
        }),
      });

      await createMaintenanceTicket({
        space_id: 'space-1',
        title: 'Cracked foundation',
      });

      expect(insertedData.ai_severity).toBe('high');
      expect(insertedData.ai_category).toBe('structural');
      expect(insertedData.priority).toBe(2); // high -> 2
    });

    it('auto-triages critical tickets to triaged status', async () => {
      const triageResult = {
        severity: 'critical',
        category: 'safety',
        diy_instructions: '',
        estimated_cost_usd: 1000,
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(triageResult),
      } as any);

      let insertedData: any = null;

      mockFrom.mockReturnValueOnce({
        insert: vi.fn().mockImplementation((data: any) => {
          insertedData = data;
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'ticket-1', ...data },
                error: null,
              }),
            }),
          };
        }),
      });

      await createMaintenanceTicket({
        space_id: 'space-1',
        title: 'Gas smell',
      });

      expect(insertedData.status).toBe('triaged'); // critical -> auto-triaged
      expect(insertedData.priority).toBe(1);
    });
  });

  describe('updateTicketStatus', () => {
    it('sets resolved_at when status is resolved', async () => {
      let updatedData: any = null;

      mockFrom.mockReturnValueOnce({
        update: vi.fn().mockImplementation((data: any) => {
          updatedData = data;
          return {
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'ticket-1', ...data },
                  error: null,
                }),
              }),
            }),
          };
        }),
      });

      await updateTicketStatus('ticket-1', 'resolved');
      expect(updatedData.resolved_at).toBeDefined();
      expect(updatedData.status).toBe('resolved');
    });

    it('sets resolved_at when status is closed', async () => {
      let updatedData: any = null;

      mockFrom.mockReturnValueOnce({
        update: vi.fn().mockImplementation((data: any) => {
          updatedData = data;
          return {
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'ticket-1', ...data },
                  error: null,
                }),
              }),
            }),
          };
        }),
      });

      await updateTicketStatus('ticket-1', 'closed');
      expect(updatedData.resolved_at).toBeDefined();
    });

    it('does not set resolved_at for non-terminal statuses', async () => {
      let updatedData: any = null;

      mockFrom.mockReturnValueOnce({
        update: vi.fn().mockImplementation((data: any) => {
          updatedData = data;
          return {
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'ticket-1', ...data },
                  error: null,
                }),
              }),
            }),
          };
        }),
      });

      await updateTicketStatus('ticket-1', 'in_progress');
      expect(updatedData.resolved_at).toBeUndefined();
    });

    it('sets assigned_to when provided', async () => {
      let updatedData: any = null;

      mockFrom.mockReturnValueOnce({
        update: vi.fn().mockImplementation((data: any) => {
          updatedData = data;
          return {
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'ticket-1', ...data },
                  error: null,
                }),
              }),
            }),
          };
        }),
      });

      await updateTicketStatus('ticket-1', 'vendor_assigned', 'vendor-1');
      expect(updatedData.assigned_to).toBe('vendor-1');
    });
  });

  describe('getMaintenanceTickets - RBAC', () => {
    it('restricts tenants to their own tickets', async () => {
      const { getCurrentUser } = await import('@/lib/actions/auth');
      vi.mocked(getCurrentUser).mockResolvedValueOnce({ id: 'tenant-1', role: 'tenant' } as any);

      const mockEq = vi.fn().mockResolvedValue({ data: [], error: null });

      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              eq: mockEq,
            }),
          }),
        }),
      });

      await getMaintenanceTickets();
      expect(mockEq).toHaveBeenCalledWith('reporter_id', 'tenant-1');
    });

    it('restricts vendors to assigned tickets', async () => {
      const { getCurrentUser } = await import('@/lib/actions/auth');
      vi.mocked(getCurrentUser).mockResolvedValueOnce({ id: 'vendor-1', role: 'vendor' } as any);

      const mockEq = vi.fn().mockResolvedValue({ data: [], error: null });

      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              eq: mockEq,
            }),
          }),
        }),
      });

      await getMaintenanceTickets();
      expect(mockEq).toHaveBeenCalledWith('assigned_to', 'vendor-1');
    });
  });
});
