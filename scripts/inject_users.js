const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function injectUsers() {
  console.log("Creating Owner...");
  const { data: ownerData, error: ownerErr } = await supabaseAdmin.auth.admin.createUser({
    email: 'test_auto_owner@example.com',
    password: 'Password123!',
    email_confirm: true,
    user_metadata: {
      role: 'owner',
      full_name: 'Automated Owner'
    }
  });

  if (ownerErr) console.log("Owner Err:", ownerErr.message);
  else console.log("Owner created.");
}

injectUsers();
