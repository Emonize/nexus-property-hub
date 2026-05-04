const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cgjvbwufjlwyynwfyhlk.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnanZid3Vmamx3eXlud2Z5aGxrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDk4MzM3NywiZXhwIjoyMDkwNTU5Mzc3fQ.pFLF0-ZLppELho5FPjEgQtMWxvVj3iJ-oGQOhfPRHkk';

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function synchronizeState() {
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
  if (authError) {
    fs.writeFileSync('sync_out.txt', 'Auth Error: ' + authError.message);
    return;
  }
  
  const { data: publicUsers, error: publicError } = await supabaseAdmin.from('users').select('id, email');
  if (publicError) {
    fs.writeFileSync('sync_out.txt', 'Public Error: ' + publicError.message);
    return;
  }

  const authUsers = authData.users;
  
  const authEmails = authUsers.map(u => ({ id: u.id, email: u.email }));
  const publicEmails = publicUsers.map(u => ({ id: u.id, email: u.email }));

  let out = "=== AUTH USERS ===\n";
  authEmails.forEach(u => out += `${u.email} - ${u.id}\n`);

  out += "\n=== PUBLIC USERS ===\n";
  publicEmails.forEach(u => out += `${u.email} - ${u.id}\n`);

  // Find inconsistencies
  const authEmailsSet = new Set(authEmails.map(u => u.email));
  const publicEmailsSet = new Set(publicEmails.map(u => u.email));

  out += "\n=== INCONSISTENCIES ===\n";
  const inAuthNotPublic = authEmails.filter(u => !publicEmailsSet.has(u.email));
  if (inAuthNotPublic.length > 0) {
    out += "Found in Auth but NOT in Public:\n";
    inAuthNotPublic.forEach(u => out += `${u.email} (${u.id})\n`);
  } else {
    out += "No users found in Auth that are missing in Public.\n";
  }

  const inPublicNotAuth = publicEmails.filter(u => !authEmailsSet.has(u.email));
  if (inPublicNotAuth.length > 0) {
    out += "\nFound in Public but NOT in Auth (These will block new invites!):\n";
    inPublicNotAuth.forEach(u => out += `${u.email} (${u.id})\n`);
  } else {
    out += "\nNo users found in Public that are missing in Auth.\n";
  }
  
  fs.writeFileSync('sync_out.txt', out);
}

synchronizeState();
