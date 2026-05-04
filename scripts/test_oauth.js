const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cgjvbwufjlwyynwfyhlk.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnanZid3Vmamx3eXlud2Z5aGxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5ODMzNzcsImV4cCI6MjA5MDU1OTM3N30.f7np54EKtxK5IWiMpldRROugAYfbOKq2EmC34SjJSgA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testGoogleOAuth() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'http://localhost:3000/auth/callback',
    },
  });
  
  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('Success URL:', data.url);
  }
}

testGoogleOAuth();
