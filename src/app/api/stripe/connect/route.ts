 
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
  apiVersion: '2026-03-25.dahlia',
});

// Create Stripe Connect onboarding link for owners
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('users')
    .select('stripe_connect_id, role')
    .eq('id', user.id)
    .single();

  if (!profile || !['owner', 'manager'].includes(profile.role)) {
    return NextResponse.json({ error: 'Only owners and managers can onboard' }, { status: 403 });
  }

  try {
    let accountId = profile.stripe_connect_id;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'custom',
        country: 'US',
        email: user.email!,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
      });
      accountId = account.id;

      await supabase
        .from('users')
        .update({ stripe_connect_id: accountId })
        .eq('id', user.id);
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/payments?refresh=true`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/payments?success=true`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    console.error('Stripe Connect error:', error);
    return NextResponse.json({ error: 'Failed to create onboarding link' }, { status: 500 });
  }
}

// Create payment intent for rent payment
export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { payment_id } = await request.json();

  const { data: payment } = await supabase
    .from('rent_payments')
    .select(`*, lease:leases(*, space:spaces(owner_id))`)
    .eq('id', payment_id)
    .single();

  if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });

  const { data: tenant } = await supabase
    .from('users')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single();

  const { data: owner } = await supabase
    .from('users')
    .select('stripe_connect_id')
    .eq('id', (payment as Record<string, unknown> & { lease: { space: { owner_id: string } } }).lease.space.owner_id)
    .single();

  try {
    const paymentIntentData: Stripe.PaymentIntentCreateParams = {
      amount: Math.round(Number(payment.amount) * 100), // cents
      currency: 'usd',
      metadata: {
        payment_id: payment.id,
        lease_id: payment.lease_id,
        tenant_id: payment.tenant_id,
      },
    };

    if (tenant?.stripe_customer_id) {
      paymentIntentData.customer = tenant.stripe_customer_id;
    }

    if (owner?.stripe_connect_id) {
      paymentIntentData.transfer_data = {
        destination: owner.stripe_connect_id,
      };
      if (payment.lease?.split_group_id) {
        paymentIntentData.transfer_group = `rent_${payment.lease.split_group_id}_${payment.due_date.substring(0, 7)}`;
      }
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);

    await supabase
      .from('rent_payments')
      .update({ status: 'processing', stripe_payment_id: paymentIntent.id })
      .eq('id', payment_id);

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error('Payment intent error:', error);
    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 });
  }
}
