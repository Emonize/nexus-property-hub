 
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
  apiVersion: '2026-03-25.dahlia',
});

/**
 * POST: Creates a Stripe SetupIntent for saving a payment method.
 * Used during tenant onboarding to collect card/bank details
 * without charging immediately.
 *
 * If the tenant doesn't have a Stripe Customer yet, one is created.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('users')
    .select('stripe_customer_id, email, full_name')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  try {
    let customerId = profile.stripe_customer_id;

    // Create Stripe Customer if one doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile.email || user.email!,
        name: profile.full_name,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;

      await supabase
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    // Create SetupIntent for future payments
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      metadata: { user_id: user.id },
    });

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
      customerId,
    });
  } catch (error: Error | unknown) {
    console.error('Stripe SetupIntent error:', error instanceof Error ? error.message : 'Unknown Error');
    return NextResponse.json({ error: 'Failed to create setup intent' }, { status: 500 });
  }
}
