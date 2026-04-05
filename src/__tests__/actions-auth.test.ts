/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSignUp = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignInWithOAuth = vi.fn();
const mockSignOut = vi.fn();
const mockAuthGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    auth: {
      signUp: mockSignUp,
      signInWithPassword: mockSignInWithPassword,
      signInWithOAuth: mockSignInWithOAuth,
      signOut: mockSignOut,
      getUser: mockAuthGetUser,
    },
    from: mockFrom,
  })),
}));

import { signUp, signIn, signInWithGoogle, getCurrentUser, deleteAccount } from '@/lib/actions/auth';

describe('Auth Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('signUp', () => {
    it('returns user on successful signup', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' };
      mockSignUp.mockResolvedValue({ data: { user: mockUser }, error: null });

      const result = await signUp({
        email: 'test@example.com',
        password: 'password123',
        full_name: 'Test User',
        role: 'tenant',
      });

      expect(result.data?.user).toEqual(mockUser);
      expect(result.error).toBeUndefined();
    });

    it('passes role in user metadata', async () => {
      mockSignUp.mockResolvedValue({ data: { user: {} }, error: null });

      await signUp({
        email: 'test@example.com',
        password: 'password123',
        full_name: 'Test Owner',
        role: 'owner',
      });

      expect(mockSignUp).toHaveBeenCalledWith(
        expect.objectContaining({
          options: {
            data: {
              full_name: 'Test Owner',
              role: 'owner',
            },
          },
        })
      );
    });

    it('returns error on failure', async () => {
      mockSignUp.mockResolvedValue({
        data: { user: null },
        error: { message: 'Email already registered' },
      });

      const result = await signUp({
        email: 'existing@example.com',
        password: 'password123',
        full_name: 'Test',
        role: 'tenant',
      });

      expect(result.error).toBe('Email already registered');
    });
  });

  describe('signIn', () => {
    it('returns user on successful login', async () => {
      const mockUser = { id: 'user-1' };
      mockSignInWithPassword.mockResolvedValue({ data: { user: mockUser }, error: null });

      const result = await signIn({ email: 'test@example.com', password: 'pass' });
      expect(result.data?.user).toEqual(mockUser);
    });

    it('returns error on invalid credentials', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid login credentials' },
      });

      const result = await signIn({ email: 'test@example.com', password: 'wrong' });
      expect(result.error).toBe('Invalid login credentials');
    });
  });

  describe('signInWithGoogle', () => {
    it('returns OAuth URL on success', async () => {
      mockSignInWithOAuth.mockResolvedValue({
        data: { url: 'https://accounts.google.com/o/oauth2/...' },
        error: null,
      });

      const result = await signInWithGoogle();
      expect(result.data?.url).toContain('https://');
    });

    it('returns error on OAuth failure', async () => {
      mockSignInWithOAuth.mockResolvedValue({
        data: { url: null },
        error: { message: 'OAuth provider error' },
      });

      const result = await signInWithGoogle();
      expect(result.error).toBe('OAuth provider error');
    });
  });

  describe('getCurrentUser', () => {
    it('returns null when not authenticated', async () => {
      mockAuthGetUser.mockResolvedValue({ data: { user: null } });

      const result = await getCurrentUser();
      expect(result).toBeNull();
    });

    it('returns profile when authenticated', async () => {
      mockAuthGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'user-1', role: 'owner', full_name: 'Test' },
              error: null,
            }),
          }),
        }),
      });

      const result = await getCurrentUser();
      expect(result).toEqual({ id: 'user-1', role: 'owner', full_name: 'Test' });
    });
  });

  describe('deleteAccount', () => {
    it('returns error when not authenticated', async () => {
      mockAuthGetUser.mockResolvedValue({ data: { user: null } });

      const result = await deleteAccount();
      expect(result.error).toBe('Not authenticated');
    });

    it('deletes user and signs out', async () => {
      mockAuthGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      mockFrom.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });
      mockSignOut.mockResolvedValue({ error: null });

      const result = await deleteAccount();
      expect(result).toEqual({ success: true });
      expect(mockSignOut).toHaveBeenCalled();
    });
  });
});
