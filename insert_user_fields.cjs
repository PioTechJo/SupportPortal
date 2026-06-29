const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = "https://ybacrvdkbgljdykdogpz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_iGtlYcPTXQlu6dSpI-tKbQ_4naHYgD_";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  console.log("Trying to insert into 'users' with 'full_name' instead of 'name'...");
  const { data, error } = await supabase
    .from('users')
    .insert([{ id: 'test-user-id-2', email: 'test2@example.com', full_name: 'Test User', created_at: new Date().toISOString() }])
    .select();
  console.log("Insert Result:", { data, error });
}
run();
