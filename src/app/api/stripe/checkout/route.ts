import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
  apiVersion: '2026-03-25.dahlia',
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { plan } = await request.json(); // e.g. 'pro' or 'scale'

    // Get the user's Stripe Customer ID
    const { data: user } = await supabase
      .from('users')
      .select('stripe_customer_id, email, full_name')
      .eq('id', session.user.id)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let customerId = user.stripe_customer_id;

    if (!customerId) {
      // Create a customer if they don't have one
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.full_name,
        metadata: {
          supabase_uuid: session.user.id,
        },
      });
      customerId = customer.id;

      // Save to Supabase using a service client (or an RPC if RLS blocks it)
      // Since normal users might not have update permissions on their own stripe_customer_id, 
      // we'll update it later or via webhook, but ideally we should update it now.
      // We will assume they have update permissions for their own record for now.
      await supabase
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', session.user.id);
    }

    // Replace with your actual Stripe Price IDs created in the dashboard
    let priceId = '';
    if (plan === 'pro') {
      priceId = process.env.STRIPE_PRO_PRICE_ID || 'price_dummy_pro';
    } else if (plan === 'scale') {
      priceId = process.env.STRIPE_SCALE_PRICE_ID || 'price_dummy_scale';
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err: any) {
    console.error('Checkout error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
