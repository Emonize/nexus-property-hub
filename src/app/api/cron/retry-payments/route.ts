import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServiceClient } from '@/lib/supabase/server';
import { dispatchNotification } from '@/lib/notifications/dispatcher';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
  apiVersion: '2026-03-25.dahlia' as any,
});

/**
 * Payment Retry & Escalation Engine
 * Runs daily via Vercel Cron. Processes overdue/failed payments
 * on the following schedule:
 *
 *   Day 1:  Payment auto-attempted (handled by generate-payments)
 *   Day 3:  Retry failed + SMS/push notification
 *   Day 5:  Second retry + email warning
 *   Day 7:  Late fee applied, owner notified
 *   Day 14: Escalation flag for owner action
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createServiceClient();
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Fetch all overdue payments (pending or failed, due_date in the past)
  const { data: overduePayments, error } = await supabase
    .from('rent_payments')
    .select(`
      id, lease_id, tenant_id, amount, due_date, status, late_fee, notes,
      lease:leases(space_id, split_group_id, space:spaces(name, owner_id))
    `)
    .in('status', ['pending', 'failed'])
    .lt('due_date', todayStr)
    .order('due_date', { ascending: true });

  if (error || !overduePayments) {
    console.error('Retry cron: Failed to fetch overdue payments', error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }

  const results = {
    retried: 0,
    notified: 0,
    lateFees: 0,
    escalated: 0,
    errors: 0,
  };

  for (const payment of overduePayments) {
    const dueDate = new Date(payment.due_date);
    const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    const lease = payment.lease as any;
    const spaceName = lease?.space?.name || 'Unknown space';
    const ownerId = lease?.space?.owner_id;

    try {
      // Day 3: First retry + SMS notification
      if (daysOverdue >= 3 && daysOverdue < 5) {
        await retryPayment(supabase, payment);
        results.retried++;

        await dispatchNotification({
          userId: payment.tenant_id,
          type: 'payment_reminder',
          title: 'Rent Payment Overdue',
          body: `Your rent payment of $${payment.amount} for ${spaceName} is ${daysOverdue} days overdue. Please make payment to avoid late fees.`,
          channels: ['app', 'sms'],
        });
        results.notified++;
      }

      // Day 5: Second retry + email warning
      else if (daysOverdue >= 5 && daysOverdue < 7) {
        await retryPayment(supabase, payment);
        results.retried++;

        await dispatchNotification({
          userId: payment.tenant_id,
          type: 'payment_reminder',
          title: 'Urgent: Rent Payment Required',
          body: `Your rent of $${payment.amount} for ${spaceName} is ${daysOverdue} days late. A late fee will be applied in ${7 - daysOverdue} day(s) if not paid.`,
          channels: ['app', 'email'],
        });
        results.notified++;
      }

      // Day 7: Apply late fee + notify owner
      else if (daysOverdue >= 7 && daysOverdue < 14) {
        const lateFeeAmount = calculateLateFee(Number(payment.amount));

        // Only apply late fee once
        if (!payment.late_fee || Number(payment.late_fee) === 0) {
          const timestamp = now.toISOString();
          const existingNotes = payment.notes || '';
          await supabase
            .from('rent_payments')
            .update({
              late_fee: lateFeeAmount,
              notes: `${existingNotes}\n[${timestamp}] Late fee of $${lateFeeAmount} applied (${daysOverdue} days overdue)`.trim(),
            })
            .eq('id', payment.id);
          results.lateFees++;
        }

        // Notify tenant about late fee
        await dispatchNotification({
          userId: payment.tenant_id,
          type: 'payment_reminder',
          title: 'Late Fee Applied',
          body: `A late fee of $${lateFeeAmount} has been applied to your overdue rent of $${payment.amount} for ${spaceName}. Total due: $${Number(payment.amount) + lateFeeAmount}.`,
          channels: ['app', 'sms', 'email'],
        });

        // Notify owner
        if (ownerId) {
          await dispatchNotification({
            userId: ownerId,
            type: 'payment_reminder',
            title: 'Tenant Payment Overdue — Late Fee Applied',
            body: `Rent for ${spaceName} is ${daysOverdue} days overdue ($${payment.amount}). A late fee of $${lateFeeAmount} has been applied automatically.`,
            channels: ['app', 'email'],
          });
        }
        results.notified++;
      }

      // Day 14+: Escalation — flag for owner action
      else if (daysOverdue >= 14) {
        const existingNotes = payment.notes || '';
        if (!existingNotes.includes('[ESCALATED]')) {
          await supabase
            .from('rent_payments')
            .update({
              notes: `${existingNotes}\n[${now.toISOString()}] [ESCALATED] Payment ${daysOverdue} days overdue. Flagged for owner review.`.trim(),
            })
            .eq('id', payment.id);

          if (ownerId) {
            await dispatchNotification({
              userId: ownerId,
              type: 'payment_reminder',
              title: 'ACTION REQUIRED: Payment Escalation',
              body: `Rent for ${spaceName} is now ${daysOverdue} days overdue ($${Number(payment.amount) + Number(payment.late_fee || 0)} total). This requires your direct attention.`,
              channels: ['app', 'sms', 'email'],
            });
          }
          results.escalated++;
        }
      }
    } catch (err) {
      console.error(`Retry cron: Error processing payment ${payment.id}`, err);
      results.errors++;
    }
  }

  console.log(`Retry cron: processed ${overduePayments.length} overdue payments`, results);

  return NextResponse.json({
    processed: overduePayments.length,
    ...results,
  });
}

/**
 * Attempt to retry a failed payment via Stripe.
 * If the tenant has a saved payment method, creates a new PaymentIntent
 * with off_session=true for automatic charge.
 */
async function retryPayment(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  payment: { id: string; tenant_id: string; amount: number; lease_id: string; lease: any }
) {
  // Look up the tenant's saved Stripe customer ID
  const { data: tenant } = await supabase
    .from('users')
    .select('stripe_customer_id')
    .eq('id', payment.tenant_id)
    .single();

  if (!tenant?.stripe_customer_id || !process.env.STRIPE_SECRET_KEY) {
    // No saved payment method — mark as failed, can't auto-retry
    await supabase
      .from('rent_payments')
      .update({
        status: 'failed',
        notes: `${payment.lease?.notes || ''}\n[${new Date().toISOString()}] Auto-retry skipped: no saved payment method`.trim(),
      })
      .eq('id', payment.id);
    return;
  }

  const ownerId = payment.lease?.space?.owner_id;
  const splitGroupId = payment.lease?.split_group_id;
  const monthKey = payment.lease?.due_date?.substring(0, 7);

  try {
    // Look up owner's connected account for transfer routing
    let transferData: { destination: string } | undefined;
    let transferGroup: string | undefined;

    if (ownerId) {
      const { data: owner } = await supabase
        .from('users')
        .select('stripe_connect_id')
        .eq('id', ownerId)
        .single();

      if (owner?.stripe_connect_id) {
        transferData = { destination: owner.stripe_connect_id };
        if (splitGroupId) {
          transferGroup = `rent_${splitGroupId}_${monthKey}`;
        }
      }
    }

    const intentParams: Stripe.PaymentIntentCreateParams = {
      amount: Math.round(Number(payment.amount) * 100),
      currency: 'usd',
      customer: tenant.stripe_customer_id,
      off_session: true,
      confirm: true,
      metadata: {
        payment_id: payment.id,
        lease_id: payment.lease_id,
        tenant_id: payment.tenant_id,
        retry: 'true',
      },
    };

    if (transferData) intentParams.transfer_data = transferData;
    if (transferGroup) intentParams.transfer_group = transferGroup;

    const paymentIntent = await stripe.paymentIntents.create(intentParams);

    // Update payment record with processing status
    await supabase
      .from('rent_payments')
      .update({
        status: 'processing',
        stripe_payment_id: paymentIntent.id,
        notes: `${payment.lease?.notes || ''}\n[${new Date().toISOString()}] Auto-retry initiated (${paymentIntent.id})`.trim(),
      })
      .eq('id', payment.id);
  } catch (err: any) {
    // Stripe charge failed — update status
    await supabase
      .from('rent_payments')
      .update({
        status: 'failed',
        notes: `${payment.lease?.notes || ''}\n[${new Date().toISOString()}] Auto-retry failed: ${err.message}`.trim(),
      })
      .eq('id', payment.id);
  }
}

/**
 * Calculate late fee: 5% of rent amount, minimum $25, maximum $100.
 */
function calculateLateFee(rentAmount: number): number {
  const fee = rentAmount * 0.05;
  return Math.min(100, Math.max(25, Math.round(fee * 100) / 100));
}
