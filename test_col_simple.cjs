const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = "https://ybacrvdkbgljdykdogpz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_iGtlYcPTXQlu6dSpI-tKbQ_4naHYgD_";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  console.log("Testing user_id...");
  const r1 = await supabase.from('ticket_comments').insert([{
    ticket_id: '00000000-0000-0000-0000-000000000000',
    comment_text: 'Test',
    user_id: '00000000-0000-0000-0000-000000000000'
  }]);
  console.log("user_id result:", r1.error);

  console.log("Testing author_id...");
  const r2 = await supabase.from('ticket_comments').insert([{
    ticket_id: '00000000-0000-0000-0000-000000000000',
    comment_text: 'Test',
    author_id: '00000000-0000-0000-0000-000000000000'
  }]);
  console.log("author_id result:", r2.error);
}
run().catch(console.error);
