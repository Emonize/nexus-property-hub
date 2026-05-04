import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServiceClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
  apiVersion: '2026-03-25.dahlia',
});

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = await createServiceClient();

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const paymentId = paymentIntent.metadata?.payment_id;
      if (paymentId) {
        await supabase
          .from('rent_payments')
          .update({
            status: 'paid',
            paid_date: new Date().toISOString(),
            stripe_payment_id: paymentIntent.id,
          })
          .eq('id', paymentId);
      }
      break;
    }

    case 'payment_intent.payment_failed': {
      const failedIntent = event.data.object as Stripe.PaymentIntent;
      const failedPaymentId = failedIntent.metadata?.payment_id;
      if (failedPaymentId) {
        await supabase
          .from('rent_payments')
          .update({
            status: 'failed',
            notes: `Payment failed: ${failedIntent.last_payment_error?.message || 'Unknown error'}`,
          })
          .eq('id', failedPaymentId);
      }
      break;
    }

    case 'account.updated': {
      const account = event.data.object as Stripe.Account;
      await supabase
        .from('users')
        .update({
          stripe_connect_id: account.id,
          onboarding_complete: account.charges_enabled,
        })
        .eq('stripe_connect_id', account.id);
      break;
    }

    case 'transfer.created': {
      const transfer = event.data.object as Stripe.Transfer;
      const leaseId = transfer.metadata?.lease_id;
      if (leaseId) {
        await supabase
          .from('rent_payments')
          .update({ stripe_transfer_id: transfer.id })
          .eq('stripe_payment_id', transfer.source_transaction as string);
      }
      break;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      const status = subscription.status;
      
      // Determine plan based on the price ID or product ID
      const priceId = subscription.items.data[0]?.price.id;
      // In a real app, map priceId to your plans ('pro', 'scale'). Defaulting to 'pro' for now if active.
      let plan = 'starter';
      if (status === 'active' || status === 'trialing') {
        plan = 'pro'; // We will assume pro unless logic is added to fetch product details.
        // If you have specific price IDs for 'pro' and 'scale', you can map them here.
      }

      await supabase
        .from('users')
        .update({
          subscription_status: status,
          subscription_plan: plan,
          stripe_subscription_id: subscription.id,
          subscription_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
        })
        .eq('stripe_customer_id', customerId);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
