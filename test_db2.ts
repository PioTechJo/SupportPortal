import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = "https://ybacrvdkbgljdykdogpz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_iGtlYcPTXQlu6dSpI-tKbQ_4naHYgD_";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.from('users').select('*').eq('email', 'haitham.m.n@gmail.com').maybeSingle();
  console.log(JSON.stringify(data, null, 2));
}
run();
