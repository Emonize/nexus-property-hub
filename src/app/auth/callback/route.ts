import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  const isProduction = process.env.NODE_ENV === 'production';
  const rawOrigin = isProduction 
    ? 'https://nexus-property-hub.vercel.app' 
    : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');

  if (code) {
    const response = NextResponse.redirect(`${rawOrigin}${next}`);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set({ name, value, ...options });
              response.cookies.set({ name, value, ...options });
            });
          },
        },
      }
    );

    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && sessionData?.user) {
      const intendedRole = request.cookies.get('nexus_intended_role')?.value;
      if (intendedRole) {
        try {
          const { createServiceClient } = await import('@/lib/supabase/server');
          const supabaseAdmin = await createServiceClient();
          await supabaseAdmin
            .from('users')
            .update({ role: intendedRole })
            .eq('id', sessionData.user.id);
            
          response.cookies.delete('nexus_intended_role');
        } catch (updateError) {
          console.error("Failed to update role:", updateError);
        }
      }
      return response;
    }
  }

  return NextResponse.redirect(`${rawOrigin}/auth/login?error=Could not authenticate`);
}
