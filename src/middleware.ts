import { updateSession } from '@/lib/supabase/middleware';
import { NextRequest, NextResponse } from 'next/server';

// Naive In-Memory Rate Limiter (Fits Vercel single-isolate topology)
type RateLimitData = { count: number; expiresAt: number };
const rateLimitCache = new Map<string, RateLimitData>();

function getClientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '127.0.0.1';
}

function checkRateLimit(ip: string, isWrite: boolean): boolean {
  // 100 reads per minute, 20 writes per minute
  const THRESHOLD = isWrite ? 20 : 100;
  const WINDOW_MS = 60 * 1000;
  
  const key = `${ip}_${isWrite ? 'write' : 'read'}`;
  const now = Date.now();
  const data = rateLimitCache.get(key) || { count: 0, expiresAt: now + WINDOW_MS };

  // Reset window if expired
  if (now > data.expiresAt) {
    data.count = 0;
    data.expiresAt = now + WINDOW_MS;
  }

  data.count += 1;
  rateLimitCache.set(key, data);

  return data.count <= THRESHOLD;
}

export async function middleware(request: NextRequest) {
  const isApi = request.nextUrl.pathname.startsWith('/api');

  // Apply Rate Limiting to API Routes
  if (isApi) {
    const isWrite = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method);
    const ip = getClientIp(request);
    
    // Developer bypass (whitelist localhost for intense dev sessions)
    const isLocal = ip === '127.0.0.1' || ip === '::1';
    
    if (!isLocal) {
      const allowed = checkRateLimit(ip, isWrite);
      if (!allowed) {
        return new NextResponse(
          JSON.stringify({ error: 'Too Many Requests', code: 429 }), 
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
