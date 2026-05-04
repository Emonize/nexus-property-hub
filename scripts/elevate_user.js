const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cgjvbwufjlwyynwfyhlk.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnanZid3Vmamx3eXlud2Z5aGxrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDk4MzM3NywiZXhwIjoyMDkwNTU5Mzc3fQ.pFLF0-ZLppELho5FPjEgQtMWxvVj3iJ-oGQOhfPRHkk';

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function forceElevate() {
  const { data: users, error } = await supabaseAdmin.from('users').select('id, email, role').eq('email', 'arafat72@gmail.com');
  if (error || !users.length) {
    console.error('User not found.');
    return;
  }
  
  const user = users[0];
  console.log(`Found ${user.email} with current role: ${user.role}`);
  
  const { error: upErr } = await supabaseAdmin.from('users').update({ role: 'owner' }).eq('id', user.id);
  
  if (upErr) {
    console.error('Failed to elevate:', upErr.message);
  } else {
    console.log(`Successfully elevated ${user.email} to 'owner'!`);
  }
}

forceElevate();
