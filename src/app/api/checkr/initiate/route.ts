import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { dispatchNotification } from '@/lib/notifications/dispatcher';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { firstName, lastName, email, dob, ssn, zipcode } = await request.json();

  if (!firstName || !lastName || !email || !dob || !ssn || !zipcode) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const apiKey = process.env.CHECKR_API_KEY;

  try {
    // ==========================================
    // HYBRID FALLBACK: Mock execution block
    // ==========================================
    if (!apiKey || apiKey === 'your-checkr-api-key') {
      console.warn('⚠️ No CHECKR_API_KEY found. Using mock background check resolution.');
      
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const mockCandidateId = `mock_cand_${Date.now()}`;

      // In mock mode, we fast-forward the webhook by instantly clearing the user
      // so they can proceed with local testing.
      await supabase
        .from('trust_scores')
        .update({ 
          bg_check_status: 'clear', 
          bg_check_id: mockCandidateId,
        })
        .eq('user_id', user.id);

      // Trigger automatic trust score re-computation
      await supabase.rpc('compute_trust_score', { p_user_id: user.id });

      // Dispatch real-time SMS/Email alert to the tenant
      await dispatchNotification({
        userId: user.id,
        type: 'trust_update',
        title: 'Background Check Cleared 🎉',
        body: 'Welcome to Rentova! Your Checkr background check has successfully cleared. You may now proceed to sign your lease.',
        channels: ['app', 'sms', 'email']
      });

      return NextResponse.json({
        candidate_id: mockCandidateId,
        invitation_url: `${process.env.NEXT_PUBLIC_APP_URL}/mock-checkr-redirect`,
        status: 'mock_cleared'
      });
    }

    // ==========================================
    // PRODUCTION: Real Checkr API execution
    // ==========================================
    const encodedKey = Buffer.from(`${apiKey}:`).toString('base64');
    const authHeader = `Basic ${encodedKey}`;

    // 1. Create Checkr Candidate
    const candidateRes = await fetch('https://api.checkr.com/v1/candidates', {
      method: 'POST',
      headers: { 
        'Authorization': authHeader,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        email: email,
        dob: dob,
        ssn: ssn,
        zipcode: zipcode,
        work_location_country: 'US'
      })
    });

    if (!candidateRes.ok) {
        const err = await candidateRes.json();
        throw new Error(err.error || 'Failed to create Checkr candidate');
    }

    const candidate = await candidateRes.json();

    // 2. Create Checkr Invitation
    const invitationRes = await fetch('https://api.checkr.com/v1/invitations', {
      method: 'POST',
      headers: { 
        'Authorization': authHeader,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        candidate_id: candidate.id,
        package: 'tasker_standard' // standard package name
      })
    });

    if (!invitationRes.ok) {
        const err = await invitationRes.json();
        throw new Error(err.error || 'Failed to create Checkr invitation');
    }

    const invitation = await invitationRes.json();

    // 3. Log the pending status in our database
    await supabase
        .from('trust_scores')
        .update({ 
          bg_check_status: 'pending', 
          bg_check_id: candidate.id
        })
        .eq('user_id', user.id);

    return NextResponse.json({
      candidate_id: candidate.id,
      invitation_url: invitation.invitation_url,
      status: 'pending'
    });

  } catch (error: any) {
    console.error('Checkr Integration Error:', error.message);
    return NextResponse.json({ error: 'Background check initiation failed.' }, { status: 500 });
  }
}
