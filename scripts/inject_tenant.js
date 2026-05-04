const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function injectTenant() {
  console.log("Creating Tenant...");
  const { data: tenantData, error: tenantErr } = await supabaseAdmin.auth.admin.createUser({
    email: 'test_auto_tenant@example.com',
    password: 'Password123!',
    email_confirm: true,
    user_metadata: {
      role: 'tenant',
      full_name: 'Automated Tenant'
    }
  });

  if (tenantErr) console.log("Tenant Err:", tenantErr.message);
  else console.log("Tenant created successfully.");
}

injectTenant();
