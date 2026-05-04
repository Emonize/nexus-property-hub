const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cgjvbwufjlwyynwfyhlk.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnanZid3Vmamx3eXlud2Z5aGxrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDk4MzM3NywiZXhwIjoyMDkwNTU5Mzc3fQ.pFLF0-ZLppELho5FPjEgQtMWxvVj3iJ-oGQOhfPRHkk';

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function purgeUser(email) {
  const { data: users, error } = await supabaseAdmin.from('users').select('id').eq('email', email);
  if (error || !users.length) {
    console.log(`User ${email} not found.`);
    return;
  }
  const userId = users[0].id;
  console.log(`Purging dependencies for ${email} (${userId})...`);

  // Delete trust_scores
  await supabaseAdmin.from('trust_scores').delete().eq('user_id', userId);
  
  // Delete notifications
  await supabaseAdmin.from('notifications').delete().eq('user_id', userId);

  // Delete maintenance tickets reported by or assigned to
  await supabaseAdmin.from('maintenance_tickets').delete().eq('reporter_id', userId);
  await supabaseAdmin.from('maintenance_tickets').delete().eq('assigned_to', userId);

  // For spaces owned by them, we need to delete leases and payments first
  const { data: spaces } = await supabaseAdmin.from('spaces').select('id').eq('owner_id', userId);
  if (spaces && spaces.length) {
    for (let space of spaces) {
      const { data: leases } = await supabaseAdmin.from('leases').select('id').eq('space_id', space.id);
      if (leases && leases.length) {
        for (let lease of leases) {
          await supabaseAdmin.from('rent_payments').delete().eq('lease_id', lease.id);
          await supabaseAdmin.from('leases').delete().eq('id', lease.id);
        }
      }
      await supabaseAdmin.from('spaces').delete().eq('id', space.id);
    }
  }

  const { data: tenantLeases } = await supabaseAdmin.from('leases').select('id').eq('tenant_id', userId);
  if (tenantLeases && tenantLeases.length) {
    for (let lease of tenantLeases) {
      await supabaseAdmin.from('rent_payments').delete().eq('lease_id', lease.id);
      await supabaseAdmin.from('leases').delete().eq('id', lease.id);
    }
  }

  // Delete audit logs
  await supabaseAdmin.from('audit_logs').delete().eq('actor_id', userId);

  // Finally delete the user
  const { error: delErr } = await supabaseAdmin.from('users').delete().eq('id', userId);
  if (delErr) {
    console.error(`Failed to delete ${email}:`, delErr.message);
  } else {
    console.log(`Successfully hard-deleted ${email}.`);
  }
}

async function run() {
  await purgeUser('arafat72@gmail.com');
  await purgeUser('demo@example.com');
}

run();
