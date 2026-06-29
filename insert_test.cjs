const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = "https://ybacrvdkbgljdykdogpz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_iGtlYcPTXQlu6dSpI-tKbQ_4naHYgD_";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  console.log("Trying to insert into 'roles'...");
  const { data: roleData, error: roleError } = await supabase
    .from('roles')
    .insert([{ id: 'test-role-id', role_name: 'test-role' }])
    .select();
  console.log("Role Insert Result:", { roleData, roleError });

  console.log("Trying to insert into 'users'...");
  const { data: userData, error: userError } = await supabase
    .from('users')
    .insert([{ id: 'test-user-id', email: 'test@example.com', name: 'Test User', role_name: 'admin' }])
    .select();
  console.log("User Insert Result:", { userData, userError });
}
run();
