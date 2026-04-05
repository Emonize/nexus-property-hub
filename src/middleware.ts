 
/* eslint-disable @typescript-eslint/no-unused-vars */
import { updateSession } from '@/lib/supabase/middleware';
import { checkRateLimit } from '@/lib/rate-limit';
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const isApi = request.nextUrl.pathname.startsWith('/api');

  // Apply rate limiting to API routes
  if (isApi) {
    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? '127.0.0.1';
    const isLocal = ip === '127.0.0.1' || ip === '::1';

    if (!isLocal) {
      const rateLimitResponse = await checkRateLimit(request);
      if (rateLimitResponse) return rateLimitResponse;
    }
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
