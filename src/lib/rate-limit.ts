import { NextRequest, NextResponse } from 'next/server';

// ─── Rate Limiter ─────────────────────────────────
// Uses Upstash Redis in production for cross-isolate consistency.
// Falls back to in-memory store when UPSTASH_REDIS_REST_URL is not set.

const RATE_LIMITS = {
  read: { windowMs: 60000, maxRequests: 100 },
  write: { windowMs: 60000, maxRequests: 20 },
};

function getClientIdentifier(request: NextRequest): string {
  return request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    'anonymous';
}

function isWriteMethod(method: string): boolean {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
}

// ─── Upstash Redis Rate Limiter ───────────────────
let upstashLimiter: { read: any; write: any } | null = null;

async function getUpstashLimiter() {
  if (upstashLimiter) return upstashLimiter;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  const { Ratelimit } = await import('@upstash/ratelimit');
  const { Redis } = await import('@upstash/redis');

  const redis = new Redis({ url, token });

  upstashLimiter = {
    read: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, '60 s'),
      prefix: 'nexus:rl:read',
    }),
    write: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, '60 s'),
      prefix: 'nexus:rl:write',
    }),
  };

  return upstashLimiter;
}

// ─── In-Memory Fallback ───────────────────────────
const memoryStore = new Map<string, { count: number; timestamp: number }>();

function checkMemoryRateLimit(ip: string, isWrite: boolean): { allowed: boolean; retryAfter?: number } {
  const limits = isWrite ? RATE_LIMITS.write : RATE_LIMITS.read;
  const key = `${ip}:${isWrite ? 'write' : 'read'}`;
  const now = Date.now();
  const record = memoryStore.get(key);

  if (!record || now - record.timestamp > limits.windowMs) {
    memoryStore.set(key, { count: 1, timestamp: now });
    return { allowed: true };
  }

  if (record.count >= limits.maxRequests) {
    const retryAfter = Math.ceil((record.timestamp + limits.windowMs - now) / 1000);
    return { allowed: false, retryAfter };
  }

  record.count++;
  return { allowed: true };
}

// Cleanup stale in-memory entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of memoryStore.entries()) {
      if (now - value.timestamp > 300000) memoryStore.delete(key);
    }
  }, 300000);
}

// ─── Exported Check ───────────────────────────────
export async function checkRateLimit(request: NextRequest): Promise<NextResponse | null> {
  const ip = getClientIdentifier(request);
  const isWrite = isWriteMethod(request.method);

  // Try Upstash first
  const limiter = await getUpstashLimiter();
  if (limiter) {
    const rl = isWrite ? limiter.write : limiter.read;
    const { success, limit, remaining, reset } = await rl.limit(ip);

    if (!success) {
      const retryAfter = Math.ceil((reset - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfter },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': String(limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(reset),
          },
        }
      );
    }
    return null;
  }

  // Fallback to in-memory
  const result = checkMemoryRateLimit(ip, isWrite);
  if (!result.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', retryAfter: result.retryAfter },
      {
        status: 429,
        headers: {
          'Retry-After': String(result.retryAfter || 60),
          'X-RateLimit-Limit': String(isWrite ? RATE_LIMITS.write.maxRequests : RATE_LIMITS.read.maxRequests),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  return null;
}
