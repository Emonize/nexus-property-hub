require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuery() {
  console.log('Starting query...');
  const start = Date.now();
  try {
    const { data, error } = await supabase.from('users').select('*').limit(1);
    const end = Date.now();
    console.log(`Query finished in ${end - start}ms`);
    if (error) console.error('Error:', error);
    else console.log('Data:', data);
  } catch (err) {
    console.error('Exception:', err);
  }
}

testQuery();
