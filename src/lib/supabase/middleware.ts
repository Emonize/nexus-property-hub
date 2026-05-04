import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function updateSession(request: NextRequest) {
  // In demo mode (no Supabase configured), allow all routes
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl || supabaseUrl === 'http://localhost:54321' || supabaseUrl.includes('your-')) {
    return NextResponse.next({ request });
  }

  // Production mode: enforce auth
  try {
    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            supabaseResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Protected routes
    const protectedPaths = ['/dashboard', '/spaces', '/leases', '/payments', '/maintenance', '/settings'];
    const isProtected = protectedPaths.some((path) => request.nextUrl.pathname.startsWith(path));

    // Allow demo access to dashboard without auth
    const isDemoAccess = request.nextUrl.pathname === '/dashboard' && request.nextUrl.searchParams.get('demo') === 'true';

    if (!user && isProtected && !isDemoAccess) {
      const isProd = process.env.NODE_ENV === 'production';
      const safeOrigin = process.env.NEXT_PUBLIC_APP_URL || (isProd ? 'https://nexus-property-hub.vercel.app' : request.nextUrl.origin);
      return NextResponse.redirect(`${safeOrigin}/auth/login?redirect=${request.nextUrl.pathname}`);
    }

    // Redirect logged-in users from auth pages to dashboard
    const authPaths = ['/auth/login', '/auth/signup'];
    const isAuthPage = authPaths.some((path) => request.nextUrl.pathname.startsWith(path));

    if (user && isAuthPage) {
      const isProd = process.env.NODE_ENV === 'production';
      const safeOrigin = process.env.NEXT_PUBLIC_APP_URL || (isProd ? 'https://nexus-property-hub.vercel.app' : request.nextUrl.origin);
      return NextResponse.redirect(`${safeOrigin}/dashboard`);
    }

    return supabaseResponse;
  } catch {
    // If Supabase is unreachable, allow navigation (demo mode fallback)
    return NextResponse.next({ request });
  }
}
