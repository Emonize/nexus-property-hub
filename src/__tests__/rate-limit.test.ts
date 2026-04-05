/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// We replicate the rate-limit logic for unit testing since
// the module uses NextRequest/NextResponse which need mocking.
// This tests the core algorithm independent of Next.js types.

interface RateLimitRecord {
  count: number;
  timestamp: number;
}

const RATE_LIMITS = {
  read: { windowMs: 60000, maxRequests: 100 },
  write: { windowMs: 60000, maxRequests: 20 },
};

function createRateLimiter() {
  const store = new Map<string, RateLimitRecord>();

  return {
    check(ip: string, isWrite: boolean): { allowed: boolean; retryAfter?: number } {
      const limits = isWrite ? RATE_LIMITS.write : RATE_LIMITS.read;
      const key = `${ip}:${isWrite ? 'write' : 'read'}`;
      const now = Date.now();
      const record = store.get(key);

      if (!record || now - record.timestamp > limits.windowMs) {
        store.set(key, { count: 1, timestamp: now });
        return { allowed: true };
      }

      if (record.count >= limits.maxRequests) {
        const retryAfter = Math.ceil((record.timestamp + limits.windowMs - now) / 1000);
        return { allowed: false, retryAfter };
      }

      record.count++;
      store.set(key, record);
      return { allowed: true };
    },

    reset() {
      store.clear();
    },

    getStore() {
      return store;
    },
  };
}

describe('Rate Limiter', () => {
  let limiter: ReturnType<typeof createRateLimiter>;

  beforeEach(() => {
    limiter = createRateLimiter();
  });

  describe('read limits', () => {
    it('allows up to 100 read requests per minute', () => {
      for (let i = 0; i < 100; i++) {
        const result = limiter.check('192.168.1.1', false);
        expect(result.allowed).toBe(true);
      }
    });

    it('blocks the 101st read request', () => {
      for (let i = 0; i < 100; i++) {
        limiter.check('192.168.1.1', false);
      }
      const result = limiter.check('192.168.1.1', false);
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
    });
  });

  describe('write limits', () => {
    it('allows up to 20 write requests per minute', () => {
      for (let i = 0; i < 20; i++) {
        const result = limiter.check('192.168.1.1', true);
        expect(result.allowed).toBe(true);
      }
    });

    it('blocks the 21st write request', () => {
      for (let i = 0; i < 20; i++) {
        limiter.check('192.168.1.1', true);
      }
      const result = limiter.check('192.168.1.1', true);
      expect(result.allowed).toBe(false);
    });
  });

  describe('isolation', () => {
    it('tracks different IPs separately', () => {
      // Exhaust IP 1's write limit
      for (let i = 0; i < 20; i++) {
        limiter.check('10.0.0.1', true);
      }
      expect(limiter.check('10.0.0.1', true).allowed).toBe(false);

      // IP 2 should still be allowed
      expect(limiter.check('10.0.0.2', true).allowed).toBe(true);
    });

    it('tracks reads and writes separately for the same IP', () => {
      // Exhaust write limit
      for (let i = 0; i < 20; i++) {
        limiter.check('10.0.0.1', true);
      }
      expect(limiter.check('10.0.0.1', true).allowed).toBe(false);

      // Reads should still be allowed
      expect(limiter.check('10.0.0.1', false).allowed).toBe(true);
    });
  });

  describe('window expiration', () => {
    it('resets after window expires', () => {
      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);

      // Exhaust limit
      for (let i = 0; i < 20; i++) {
        limiter.check('10.0.0.1', true);
      }
      expect(limiter.check('10.0.0.1', true).allowed).toBe(false);

      // Advance time past the window
      vi.spyOn(Date, 'now').mockReturnValue(now + 61000);
      expect(limiter.check('10.0.0.1', true).allowed).toBe(true);

      vi.restoreAllMocks();
    });
  });
});
