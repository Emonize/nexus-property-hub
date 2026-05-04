const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cgjvbwufjlwyynwfyhlk.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnanZid3Vmamx3eXlud2Z5aGxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5ODMzNzcsImV4cCI6MjA5MDU1OTM3N30.f7np54EKtxK5IWiMpldRROugAYfbOKq2EmC34SjJSgA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSignup() {
  const { data, error } = await supabase.auth.signUp({
    email: 'test_db_error_12345@gmail.com',
    password: 'Password123!',
    options: {
      data: {
        role: 'owner',
        full_name: 'Test Setup User'
      }
    }
  });
  
  if (error) {
    fs.writeFileSync('signup_error.txt', 'Error: ' + error.message);
  } else {
    fs.writeFileSync('signup_error.txt', 'Success: ' + data.user?.id);
  }
}

testSignup();
