const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = "https://ybacrvdkbgljdykdogpz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_iGtlYcPTXQlu6dSpI-tKbQ_4naHYgD_";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase
        .from('users')
        .select(`*, roles(role_name), customers(customer_name)`)
        .eq('id', '2da2ec5a-2775-4cde-bb63-a618eb792ffc')
        .maybeSingle();
  console.log(JSON.stringify(data, null, 2));
}
run();
