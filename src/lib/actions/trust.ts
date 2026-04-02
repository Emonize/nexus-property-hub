'use server';

import { createClient } from '@/lib/supabase/server';
import type { TrustScore } from '@/types/database';

export async function computeTrustScore(userId: string) {
  const supabase = await createClient();

  const { data: score, error } = await supabase.rpc('compute_trust_score', {
    p_user_id: userId,
  });

  if (error) return { error: error.message };
  return { score: score as number };
}

export async function getTrustScore(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('trust_scores')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) return { error: error.message };
  return { data: data as TrustScore };
}

export async function initiateBackgroundCheck(userId: string, personalInfo: {
  first_name: string;
  last_name: string;
  email: string;
  dob: string;
  zipcode: string;
}) {
  // Checkr API integration — SSN is sent directly from client to Checkr
  try {
    const response = await fetch('https://api.checkr.com/v1/candidates', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CHECKR_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        first_name: personalInfo.first_name,
        last_name: personalInfo.last_name,
        email: personalInfo.email,
        dob: personalInfo.dob,
        zipcode: personalInfo.zipcode,
        work_location_country: 'US',
      }),
    });

    if (!response.ok) {
      return { error: 'Failed to create Checkr candidate' };
    }

    const candidate = await response.json();

    // Create invitation for background check
    const invResponse = await fetch('https://api.checkr.com/v1/invitations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CHECKR_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        candidate_id: candidate.id,
        package: 'nexus_standard',
      }),
    });

    if (!invResponse.ok) {
      return { error: 'Failed to create Checkr invitation' };
    }

    const invitation = await invResponse.json();

    // Update trust_scores with pending status
    const supabase = await createClient();
    await supabase
      .from('trust_scores')
      .upsert({
        user_id: userId,
        score: 0,
        bg_check_status: 'pending',
        bg_check_id: candidate.id,
      });

    return { data: { candidateId: candidate.id, invitationUrl: invitation.invitation_url } };
  } catch {
    return { error: 'Background check service unavailable' };
  }
}

export async function handleCheckrWebhook(payload: {
  type: string;
  data: {
    object: {
      id: string;
      status: string;
      candidate_id: string;
      result: string;
    };
  };
}) {
  if (payload.type !== 'report.completed') return;

  const supabase = await createClient();
  const report = payload.data.object;

  const bgStatus = report.result === 'clear' ? 'clear' :
    report.result === 'consider' ? 'flagged' : 'failed';

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
}
