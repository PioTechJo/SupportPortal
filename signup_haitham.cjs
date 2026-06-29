const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = "https://ybacrvdkbgljdykdogpz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_iGtlYcPTXQlu6dSpI-tKbQ_4naHYgD_";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  console.log("Signing up haitham...");
  const { data, error } = await supabase.auth.signUp({
    email: 'haitham.m.n@gmail.com',
    password: 'password',
    options: {
      data: {
        full_name: 'Haitham M. N.',
        role: 'administrator',
        tenant_id: null
      }
    }
  });
  console.log("Response:", { data, error });
}
run();
