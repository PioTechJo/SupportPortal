import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ybacrvdkbgljdykdogpz.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_iGtlYcPTXQlu6dSpI-tKbQ_4naHYgD_';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase
    .from('users')
    .select('*, roles(role_name)')
    .eq('id', '8066aa61-7985-4be8-92cc-490b0d3f4b95')
    .maybeSingle();

  if (error) {
    console.error(JSON.stringify(error, null, 2));
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}
run();
