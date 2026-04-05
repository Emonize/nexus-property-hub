/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase before importing the module under test
const mockSingle = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();
const mockRpc = vi.fn();
const mockOrder = vi.fn();
const mockGetUser = vi.fn();

function resetChain() {
  const chain = {
    select: mockSelect.mockReturnThis(),
    eq: mockEq.mockReturnThis(),
    single: mockSingle,
    insert: mockInsert.mockReturnThis(),
    update: mockUpdate.mockReturnThis(),
    delete: mockDelete.mockReturnThis(),
    order: mockOrder.mockReturnThis(),
  };
  return chain;
}

const mockFrom = vi.fn(() => resetChain());

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

// Import after mocks are set up
import { createSpace, deleteSpace, reparentSpace, getSpaces } from '@/lib/actions/spaces';

describe('Space Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'owner-1' } } });
  });

  describe('createSpace', () => {
    it('returns error when user is not authenticated', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } });

      const result = await createSpace({ name: 'Test Building', type: 'building' });
      expect(result.error).toBe('Unauthorized');
    });

    it('creates a top-level space without parent', async () => {
      const newSpace = { id: 'space-1', name: 'Test Building', type: 'building', owner_id: 'owner-1' };

      // Mock: insert().select().single()
      mockFrom.mockReturnValueOnce({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: newSpace, error: null }),
          }),
        }),
      });

      const result = await createSpace({ name: 'Test Building', type: 'building' });
      expect(result.data).toEqual(newSpace);
      expect(result.error).toBeUndefined();
    });

    it('enforces maximum nesting depth of 6', async () => {
      // Mock getSpaceDepth: walk 6 levels of parent_id
      let callCount = 0;
      mockFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockImplementation(() => {
              callCount++;
              // Return a parent_id for 6 levels, then null
              if (callCount <= 6) {
                return Promise.resolve({ data: { parent_id: `parent-${callCount}` }, error: null });
              }
              return Promise.resolve({ data: null, error: null });
            }),
          }),
        }),
      }));

      const result = await createSpace({
        name: 'Too Deep',
        type: 'room',
        parent_id: 'parent-0',
      });

      expect(result.error).toContain('Maximum nesting depth');
    });
  });

  describe('deleteSpace', () => {
    it('returns error when user is not authenticated', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } });
      const result = await deleteSpace('space-1');
      expect(result.error).toBe('Unauthorized');
    });

    it('deletes a space successfully', async () => {
      mockFrom.mockReturnValueOnce({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      const result = await deleteSpace('space-1');
      expect(result).toEqual({ success: true });
    });
  });

  describe('reparentSpace', () => {
    it('prevents a space from being its own parent', async () => {
      const result = await reparentSpace('space-1', 'space-1');
      expect(result.error).toBe('Cannot set a space as its own parent');
    });

    it('allows reparenting to null (top-level)', async () => {
      mockFrom.mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'space-1', parent_id: null },
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await reparentSpace('space-1', null);
      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
    });
  });

  describe('getSpaces', () => {
    it('returns spaces for owner role', async () => {
      const spaces = [
        { id: 's1', name: 'Building A', type: 'building' },
        { id: 's2', name: 'Unit 1', type: 'unit' },
      ];

      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: spaces, error: null }),
          }),
        }),
      });

      const result = await getSpaces();
      expect(result.data).toEqual(spaces);
    });
  });
});
