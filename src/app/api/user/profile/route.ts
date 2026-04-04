import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get profile from users table
    const { data: profile } = await supabase
      .from('users')
      .select('full_name, phone, role, stripe_customer_id, stripe_connect_id')
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      data: {
        full_name: profile?.full_name || user.user_metadata?.full_name || '',
        email: user.email || '',
        phone: profile?.phone || '',
        role: profile?.role || 'owner',
        stripe_customer_id: profile?.stripe_customer_id || null,
        stripe_connect_id: profile?.stripe_connect_id || null,
      }
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { full_name, phone } = body;

    // Update users table
    const { error: updateError } = await supabase
      .from('users')
      .update({
        full_name: full_name || undefined,
        phone: phone || undefined,
      })
      .eq('id', user.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Also update auth metadata
    await supabase.auth.updateUser({
      data: { full_name },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
