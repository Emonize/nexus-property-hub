const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function cleanAll() {
  const emails = ['test_auto_owner@example.com', 'test_auto_tenant@example.com', 'tenant_verify_123@example.com'];
  
  for (const email of emails) {
    const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
    const user = userList.users.find(u => u.email === email);
    if (!user) continue;

    console.log("Deleting:", email);
    
    // public.users will cascade from auth.users theoretically, but spaces might block it
    await supabaseAdmin.from('spaces').delete().eq('owner_id', user.id);
    await supabaseAdmin.from('leases').delete().eq('tenant_id', user.id);
    await supabaseAdmin.from('users').delete().eq('id', user.id);
    await supabaseAdmin.auth.admin.deleteUser(user.id);
  }
  console.log("purged");
}

cleanAll();
