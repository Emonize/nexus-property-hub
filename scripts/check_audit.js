const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cgjvbwufjlwyynwfyhlk.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnanZid3Vmamx3eXlud2Z5aGxrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDk4MzM3NywiZXhwIjoyMDkwNTU5Mzc3fQ.pFLF0-ZLppELho5FPjEgQtMWxvVj3iJ-oGQOhfPRHkk';

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function checkCurrentUsers() {
  const { data: authData } = await supabaseAdmin.auth.admin.listUsers();
  const { data: publicUsers } = await supabaseAdmin.from('users').select('id, email, role');
  
  let out = `Auth users count: ${authData.users.length}\n`;
  authData.users.forEach(u => out += `Auth: ${u.email} (${u.id})\n`);
  
  out += `\nPublic users count: ${publicUsers.length}\n`;
  publicUsers.forEach(u => out += `Public: ${u.email} (${u.id}) Role: ${u.role}\n`);
  
  fs.writeFileSync('current_users.txt', out);
}

checkCurrentUsers();
