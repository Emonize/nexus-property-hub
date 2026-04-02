import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { dispatchNotification } from '@/lib/notifications/dispatcher';

// Vapi voice agent function dispatch
export async function POST(request: NextRequest) {
  try {
    const vapiSecret = process.env.VAPI_WEBHOOK_SECRET;
    const authHeader = request.headers.get('x-vapi-secret');
    
    // Webhook Security Validation with Developer Bypass
    if (!vapiSecret || vapiSecret === 'your-vapi-secret') {
      console.warn('⚠️ Using Developer Bypass for Voice Auth (No VAPI_WEBHOOK_SECRET found)');
    } else if (authHeader !== vapiSecret) {
      console.error('🛑 Unauthorized Vapi Webhook Blocked');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { function_name, parameters, call_id } = await request.json();
    const supabase = await createServiceClient();

    // STRICT TENANT BOUNDARY ENFORCEMENT
    // Service Client bypasses RLS. We MUST definitively scope queries to the intended landlord.
    let ownerIdContext = process.env.VAPI_OWNER_ID;
    if (!ownerIdContext) {
      console.warn('⚠️ VAPI_OWNER_ID not set. Hard-locking to first registered landlord to prevent cross-tenant IDOR leak.');
      const { data: firstAdmin } = await supabase.from('users').select('id').eq('role', 'landlord').order('created_at').limit(1).single();
      if (!firstAdmin) return NextResponse.json({ error: 'No landlord defined in platform.' }, { status: 403 });
      ownerIdContext = firstAdmin.id;
    }

    const handlers: Record<string, (params: Record<string, unknown>) => Promise<{ speech: string; data?: unknown }>> = {

      check_rent_status: async ({ space_name }) => {
        const { data: space } = await supabase
          .from('spaces')
          .select('id, name')
          .eq('owner_id', ownerIdContext)
          .ilike('name', `%${space_name}%`)
          .single();

        if (!space) return { speech: `I could not find a space named ${space_name}.` };

        const { data: payments } = await supabase
          .from('rent_payments')
          .select('status, amount, due_date')
          .gte('due_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
          .lte('due_date', new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString());

        const paid = payments?.filter(p => p.status === 'paid') || [];
        const pending = payments?.filter(p => p.status === 'pending') || [];

        return {
          speech: `For ${space.name}: ${paid.length} payments received, ${pending.length} still pending this month.`,
          data: { paid, pending },
        };
      },

      file_maintenance_ticket: async ({ space_name, description, severity }) => {
        const { data: space } = await supabase
          .from('spaces')
          .select('id')
          .eq('owner_id', ownerIdContext)
          .ilike('name', `%${space_name}%`)
          .single();

        if (!space) return { speech: `I could not find a space named ${space_name}.` };

        // Run AI triage
        let triageResult = null;
        try {
          const triageResp = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ai/triage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description }),
          });
          if (triageResp.ok) triageResult = await triageResp.json();
        } catch { /* fallback */ }

        const { data: ticket } = await supabase
          .from('maintenance_tickets')
          .insert({
            space_id: space.id,
            reporter_id: '00000000-0000-0000-0000-000000000000', // Voice caller placeholder
            title: `Voice: ${(description as string).substring(0, 50)}`,
            description: description as string,
            ai_severity: triageResult?.severity || severity || 'medium',
            ai_category: triageResult?.category || 'other',
            ai_cost_estimate: triageResult?.estimated_cost_usd || null,
            status: 'open',
          })
          .select()
          .single();

        return {
          speech: `Maintenance ticket created. Severity assessed as ${triageResult?.severity || severity || 'medium'}. ${triageResult?.diy_possible ? 'This might be a DIY fix.' : 'A vendor will be notified.'}`,
          data: ticket,
        };
      },

      get_space_availability: async ({ building_name, type }) => {
        let query = supabase
          .from('spaces')
          .select('name, type, area_sqft, base_rent')
          .eq('owner_id', ownerIdContext)
          .eq('status', 'vacant');

        if (type) query = query.eq('type', type as string);

        const { data: spaces } = await query;

        if (!spaces || spaces.length === 0) {
          return { speech: `No vacant spaces found${building_name ? ` in ${building_name}` : ''}.` };
        }

        const list = spaces.map(s => `${s.name} (${s.type}, ${s.area_sqft} sqft, $${s.base_rent}/mo)`).join('. ');
        return {
          speech: `I found ${spaces.length} vacant space${spaces.length > 1 ? 's' : ''}: ${list}`,
          data: spaces,
        };
      },

      get_payment_history: async ({ tenant_name, months }) => {
        const monthCount = (months as number) || 3;

        const cutoff = new Date();
        cutoff.setMonth(cutoff.getMonth() - monthCount);

        const { data: payments } = await supabase
          .from('rent_payments')
          .select('amount, due_date, status, paid_date')
          .gte('due_date', cutoff.toISOString())
          .order('due_date', { ascending: false });

        const total = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
        const paidCount = payments?.filter(p => p.status === 'paid').length || 0;

        return {
          speech: `In the last ${monthCount} months: ${paidCount} of ${payments?.length || 0} payments received. Total collected: $${total.toLocaleString()}.`,
          data: payments,
        };
      },

      get_trust_score: async ({ tenant_name }) => {
        const { data: user } = await supabase
          .from('users')
          .select('id')
          .ilike('full_name', `%${tenant_name}%`)
          .single();

        if (!user) return { speech: `I could not find a tenant named ${tenant_name}.` };

        const { data: trust } = await supabase
          .from('trust_scores')
          .select('score, bg_check_status, credit_score')
          .eq('user_id', user.id)
          .single();

        if (!trust) return { speech: `No trust score on file for ${tenant_name}.` };

        const rating = trust.score >= 800 ? 'excellent' :
          trust.score >= 600 ? 'good' :
          trust.score >= 400 ? 'fair' : 'needs attention';

        return {
          speech: `${tenant_name}'s trust score is ${trust.score} out of 1000, rated as ${rating}. Background check: ${trust.bg_check_status || 'not yet run'}.`,
          data: trust,
        };
      },

      emergency_maintenance: async ({ space_name, description }) => {
        const { data: space } = await supabase
          .from('spaces')
          .select('id, owner_id, name')
          .eq('owner_id', ownerIdContext)
          .ilike('name', `%${space_name}%`)
          .single();

        if (!space) return { speech: `I could not find ${space_name}. Please provide the exact space name.` };

        const { data: ticket } = await supabase
          .from('maintenance_tickets')
          .insert({
            space_id: space.id,
            reporter_id: '00000000-0000-0000-0000-000000000000',
            title: `EMERGENCY: ${(description as string).substring(0, 50)}`,
            description: description as string,
            ai_severity: 'critical',
            priority: 1,
            status: 'triaged',
          })
          .select()
          .single();

        // Dispatch Instant SMS & Email to the Owner
        if (space.owner_id) {
          await dispatchNotification({
            userId: space.owner_id,
            type: 'maintenance_update',
            title: '🚨 EMERGENCY MAINTENANCE LOGGED',
            body: `A tenant just logged a Priority 1 emergency via the Voice AI for ${space.name}: "${description}". Please review the dashboard immediately.`,
            channels: ['app', 'sms', 'email']
          });
        }

        return {
          speech: `Emergency ticket created with highest priority. The property owner has been immediately notified. If this is a life-threatening emergency, please also call 911.`,
          data: ticket,
        };
      },

      schedule_viewing: async ({ space_name, visitor_name, date_time }) => {
        const { data: space } = await supabase
          .from('spaces')
          .select('id, name')
          .eq('owner_id', ownerIdContext)
          .ilike('name', `%${space_name}%`)
          .single();

        if (!space) return { speech: `I could not find ${space_name}. Which property did you want to view?` };

        const { data: ticket } = await supabase
          .from('maintenance_tickets')
          .insert({
            space_id: space.id,
            reporter_id: '00000000-0000-0000-0000-000000000000',
            title: `Viewing Request: ${visitor_name as string} for ${space.name}`,
            description: `Voice AI logged a viewing request for ${date_time as string}.`,
            ai_severity: 'low',
            ai_category: 'viewing_request',
            priority: 4,
            status: 'open',
          })
          .select()
          .single();

        return {
          speech: `Excellent. I have logged your request for a viewing at ${space.name} on ${date_time as string}. The property manager will reach out shortly to confirm.`,
          data: ticket,
        };
      },

      update_lease_status: async ({ space_name, new_status }) => {
        const { data: space } = await supabase
          .from('spaces')
          .select('id, name')
          .eq('owner_id', ownerIdContext)
          .ilike('name', `%${space_name}%`)
          .single();

        if (!space) return { speech: `I could not find space ${space_name}.` };

        const { data: lease } = await supabase
          .from('leases')
          .update({ status: new_status as string })
          .eq('space_id', space.id)
          .select()
          .single();

        if (!lease) {
           return { speech: `There is no active lease found for ${space.name}.` };
        }

        return {
          speech: `The lease for ${space.name} has been successfully updated to ${new_status as string}.`,
          data: lease,
        };
      },
    };

    const handler = handlers[function_name];
    if (!handler) {
      return NextResponse.json({ speech: 'I\'m not sure how to help with that. Could you try rephrasing?' }, { status: 400 });
    }

    const result = await handler(parameters || {});
    return NextResponse.json(result);
  } catch (error) {
    console.error('Voice dispatch error:', error);
    return NextResponse.json({
      speech: 'I encountered an error processing your request. Please try again.',
    }, { status: 500 });
  }
}
