import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const payload = await request.json();

  if (payload.type !== 'report.completed') {
    return NextResponse.json({ received: true });
  }

  const report = payload.data.object;
  const supabase = await createServiceClient();

  const bgStatus = report.result === 'clear' ? 'clear' :
    report.result === 'consider' ? 'flagged' : 'failed';

  // Update trust score record
  await supabase
    .from('trust_scores')
    .update({ bg_check_status: bgStatus })
    .eq('bg_check_id', report.candidate_id);

  // Recompute trust score
  const { data: trustRecord } = await supabase
    .from('trust_scores')
    .select('user_id')
    .eq('bg_check_id', report.candidate_id)
    .single();

  if (trustRecord) {
    await supabase.rpc('compute_trust_score', { p_user_id: trustRecord.user_id });
  }

  return NextResponse.json({ received: true });
}
