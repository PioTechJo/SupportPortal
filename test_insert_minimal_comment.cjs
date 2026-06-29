const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = "https://ybacrvdkbgljdykdogpz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_iGtlYcPTXQlu6dSpI-tKbQ_4naHYgD_";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const payload = {
    ticket_id: '00000000-0000-0000-0000-000000000000',
    comment_text: "Test minimal"
  };
  
  const { data, error } = await supabase.from('ticket_comments').insert([payload]).select();
  console.log("Result:", data);
  console.log("Error:", error);
}
run();
