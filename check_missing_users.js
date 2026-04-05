const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cgjvbwufjlwyynwfyhlk.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnanZid3Vmamx3eXlud2Z5aGxrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDk4MzM3NywiZXhwIjoyMDkwNTU5Mzc3fQ.pFLF0-ZLppELho5FPjEgQtMWxvVj3iJ-oGQOhfPRHkk';

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
  const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
  if (authError) {
    console.error('Auth Error:', authError);
    return;
  }

  const { data: publicUsers, error: publicError } = await supabaseAdmin.from('users').select('id, email, role');
  if (publicError) {
    console.error('Public Error:', publicError);
    return;
  }

  const publicUserIds = new Set(publicUsers.map(u => u.id));
  
  const missingUsers = authUsers.users.filter(u => !publicUserIds.has(u.id));
  console.log(`Found ${missingUsers.length} users in auth.users that are missing in public.users:`);
  missingUsers.forEach(u => console.log(`- ${u.email} (ID: ${u.id})`));
}

checkUsers();
