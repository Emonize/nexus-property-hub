import { NextRequest, NextResponse } from 'next/server';

// In-memory rate limiting store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; timestamp: number }>();

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

export function checkRateLimit(request: NextRequest): NextResponse | null {
  const ip = getClientIdentifier(request);
  const isWrite = isWriteMethod(request.method);
  const limits = isWrite ? RATE_LIMITS.write : RATE_LIMITS.read;
  const key = `${ip}:${isWrite ? 'write' : 'read'}`;

  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now - record.timestamp > limits.windowMs) {
    rateLimitStore.set(key, { count: 1, timestamp: now });
    return null;
  }

  if (record.count >= limits.maxRequests) {
    const retryAfter = Math.ceil((record.timestamp + limits.windowMs - now) / 1000);
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        retryAfter,
        limit: limits.maxRequests,
        window: `${limits.windowMs / 1000}s`,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(limits.maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(record.timestamp + limits.windowMs),
        },
      }
    );
  }

  record.count++;
  rateLimitStore.set(key, record);
  return null;
}

// Cleanup stale entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimitStore.entries()) {
      if (now - value.timestamp > 300000) {
        rateLimitStore.delete(key);
      }
    }
  }, 300000);
}
