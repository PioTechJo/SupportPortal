const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = "https://ybacrvdkbgljdykdogpz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_iGtlYcPTXQlu6dSpI-tKbQ_4naHYgD_";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  // Try to use service role key if we can guess it or something? No.
  // Wait, does the API allow querying with the anon key?
  // Let's get the user record with anon key (if public can read)
  const { data, error } = await supabase.from('users').select('*').eq('email', 'haitham.m.n@gmail.com');
  console.log(JSON.stringify(data, null, 2));
}
run();
