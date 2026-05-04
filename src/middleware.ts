 
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  // Protected routes that require authentication
  const protectedPaths = ['/dashboard', '/spaces', '/leases', '/payments', '/maintenance', '/settings'];
  const isProtected = protectedPaths.some((path) => request.nextUrl.pathname.startsWith(path));

  // Allow demo access to dashboard without auth
  const isDemoAccess = request.nextUrl.pathname === '/dashboard' && request.nextUrl.searchParams.get('demo') === 'true';

  if (isProtected && !isDemoAccess) {
    // Check for Supabase auth cookie (lightweight check without importing @supabase/ssr)
    const allCookies = request.cookies.getAll();
    const hasAuthCookie = allCookies.some(c => 
      c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
    );

    if (!hasAuthCookie) {
      const origin = process.env.NODE_ENV === 'production'
        ? 'https://nexus-property-hub.vercel.app'
        : (process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin);
      return NextResponse.redirect(`${origin}/auth/login?redirect=${request.nextUrl.pathname}`);
    }
  }

  // Redirect logged-in users from auth pages to dashboard
  const authPaths = ['/auth/login', '/auth/signup'];
  const isAuthPage = authPaths.some((path) => request.nextUrl.pathname.startsWith(path));

  if (isAuthPage) {
    const allCookies = request.cookies.getAll();
    const hasAuthCookie = allCookies.some(c => 
      c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
    );

    if (hasAuthCookie) {
      const origin = process.env.NODE_ENV === 'production'
        ? 'https://nexus-property-hub.vercel.app'
        : (process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin);
      return NextResponse.redirect(`${origin}/dashboard`);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};


