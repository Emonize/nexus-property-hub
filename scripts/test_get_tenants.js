const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testGetTenants() {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select(`
      id, full_name, email, phone, role,
      leases(
        id, space_id, status,
        space:spaces(name)
      ),
      trust:trust_scores(score)
    `)
    .eq('role', 'tenant');
    
  console.log("Tenants:", data);
  console.log("Error:", error);
}

testGetTenants();
