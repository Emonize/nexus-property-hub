import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import type { PaymentStatus } from '@/types/database';

/**
 * Monthly Rent Payment Generator
 * Triggered by Vercel Cron on the 1st of each month.
 * Creates a pending rent_payments row for every active lease,
 * using split_pct to calculate the fractional amount.
 */
export async function GET(request: NextRequest) {
  // Verify the request comes from Vercel Cron
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createServiceClient();

  const now = new Date();
  const dueDate = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0];
  const monthKey = dueDate.substring(0, 7); // e.g. "2026-04"

  // Fetch all active leases with space + owner info for transfer_group
  const { data: activeLeases, error: leasesError } = await supabase
    .from('leases')
    .select('id, tenant_id, monthly_rent, split_pct, split_group_id, payment_day, space_id')
    .eq('status', 'active');

  if (leasesError || !activeLeases) {
    console.error('Cron: Failed to fetch active leases', leasesError);
    return NextResponse.json({ error: leasesError?.message }, { status: 500 });
  }

  // Guard against duplicate runs: check if payments already exist for this month
  const { data: existingPayments } = await supabase
    .from('rent_payments')
    .select('lease_id')
    .eq('due_date', dueDate);

  const existingLeaseIds = new Set(existingPayments?.map(p => p.lease_id) ?? []);

  const newPayments = activeLeases
    .filter(lease => !existingLeaseIds.has(lease.id))
    .map(lease => {
      // Use the lease's payment_day if set, otherwise default to the 1st
      const day = lease.payment_day || 1;
      const leaseDueDate = new Date(now.getFullYear(), now.getMonth(), day)
        .toISOString()
        .split('T')[0];

      return {
        lease_id: lease.id,
        tenant_id: lease.tenant_id,
        amount: Number(lease.monthly_rent) * Number(lease.split_pct) / 100,
        due_date: leaseDueDate,
        status: 'pending' as PaymentStatus,
        notes: `Auto-generated for ${monthKey}`,
      };
    });

  if (newPayments.length === 0) {
    return NextResponse.json({ message: 'No new payments to generate', month: monthKey });
  }

  const { data: inserted, error: insertError } = await supabase
    .from('rent_payments')
    .insert(newPayments)
    .select('id');

  if (insertError) {
    console.error('Cron: Failed to insert payments', insertError);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  console.log(`Cron: Generated ${inserted?.length} payments for ${monthKey}`);

  return NextResponse.json({
    month: monthKey,
    generated: inserted?.length ?? 0,
    skipped: existingLeaseIds.size,
  });
}
