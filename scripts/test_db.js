const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkTenant() {
  const { data, error } = await supabaseAdmin.from('users').select('*').eq('email', 'test_auto_tenant@example.com');
  console.log("Tenant Data:", JSON.stringify(data, null, 2));
}

checkTenant();
