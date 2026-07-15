const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = "https://ybacrvdkbgljdykdogpz.supabase.co";
const supabaseKey = "sb_publishable_iGtlYcPTXQlu6dSpI-tKbQ_4naHYgD_";
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.rpc('query_pg_policies_or_something'); // we can't do this with anon key
}
