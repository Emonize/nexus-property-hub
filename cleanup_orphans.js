const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cgjvbwufjlwyynwfyhlk.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnanZid3Vmamx3eXlud2Z5aGxrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDk4MzM3NywiZXhwIjoyMDkwNTU5Mzc3fQ.pFLF0-ZLppELho5FPjEgQtMWxvVj3iJ-oGQOhfPRHkk';

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function cleanupOrphans() {
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
  if (authError) {
    console.error('Auth Error:', authError);
    return;
  }
  
  const { data: publicUsers, error: publicError } = await supabaseAdmin.from('users').select('id, email');
  if (publicError) {
    console.error('Public Error:', publicError);
    return;
  }

  const authEmailsSet = new Set(authData.users.map(u => u.email));
  const orphans = publicUsers.filter(u => !authEmailsSet.has(u.email));

  console.log(`Found ${orphans.length} orphaned records in public.users.`);

  for (const orphan of orphans) {
    console.log(`Deleting ${orphan.email} from public.users...`);
    const { error } = await supabaseAdmin.from('users').delete().eq('id', orphan.id);
    if (error) {
      console.error(`Failed to delete ${orphan.email}:`, error.message);
    } else {
      console.log(`Successfully deleted ${orphan.email}`);
    }
  }
  
  console.log("Cleanup complete!");
}

cleanupOrphans();
