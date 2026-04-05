const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cgjvbwufjlwyynwfyhlk.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnanZid3Vmamx3eXlud2Z5aGxrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDk4MzM3NywiZXhwIjoyMDkwNTU5Mzc3fQ.pFLF0-ZLppELho5FPjEgQtMWxvVj3iJ-oGQOhfPRHkk';

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function checkProfiles() {
  const { data: publicUsers } = await supabaseAdmin.from('users').select('id, email');
  
  for (const u of publicUsers) {
    const { data: profile, error } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', u.id)
      .single();
      
    if (error) {
      console.error(`Error for ${u.email}:`, error);
    }
    if (!profile) {
      console.log(`No profile returned for ${u.email}`);
    }
  }
  console.log('Checked all profiles.');
}

checkProfiles();
