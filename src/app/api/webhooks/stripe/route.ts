import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServiceClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
  apiVersion: '2026-03-25.dahlia' as any,
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
  }

  return NextResponse.json({ received: true });
}
