const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = "https://ybacrvdkbgljdykdogpz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_iGtlYcPTXQlu6dSpI-tKbQ_4naHYgD_";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const { data: user } = await supabase.from('users').select('*').eq('email', 'haitham.m.n@gmail.com').maybeSingle();
  console.log("2. Actual user row:", JSON.stringify(user, null, 2));

  if (user && user.role_id) {
    const { data: role } = await supabase.from('roles').select('*').eq('id', user.role_id).maybeSingle();
    console.log("3. Actual role row:", JSON.stringify(role, null, 2));
  } else {
    console.log("3. Actual role row: No role_id found for user.");
  }

  const { data: joined } = await supabase.from('users').select('id,email,role_id,roles(id,role_name)').eq('email', 'haitham.m.n@gmail.com');
  console.log("6. LEFT JOIN RESULT:", JSON.stringify(joined, null, 2));
}
run();
