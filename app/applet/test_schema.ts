import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ybacrvdkbgljdykdogpz.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_iGtlYcPTXQlu6dSpI-tKbQ_4naHYgD_';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('users').select('*').limit(1);
  console.log("Error:", error);
  console.log("Data:", data);
}
run();
