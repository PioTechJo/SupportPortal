const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = "https://ybacrvdkbgljdykdogpz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_iGtlYcPTXQlu6dSpI-tKbQ_4naHYgD_";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
async function run() {
  const { data: users, error: userError } = await supabase.from('users').select('*').limit(1);
  const { data: tickets, error: ticketError } = await supabase.from('tickets').select('*').limit(1);
  console.log(JSON.stringify({ users, tickets, userError, ticketError }, null, 2));
}
run();
