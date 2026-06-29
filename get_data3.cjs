const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://ybacrvdkbgljdykdogpz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_iGtlYcPTXQlu6dSpI-tKbQ_4naHYgD_";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const { data: users, error: userError } = await supabase.from('users').select('*').limit(5);
  console.log("Users:", users);
  console.log("Error:", userError);
}
run();
