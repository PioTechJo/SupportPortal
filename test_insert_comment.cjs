const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = "https://ybacrvdkbgljdykdogpz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_iGtlYcPTXQlu6dSpI-tKbQ_4naHYgD_";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const dummyTicketId = '00000000-0000-0000-0000-000000000000';
  const dummyUserId = '00000000-0000-0000-0000-000000000000';
  const payload = {
    ticket_id: dummyTicketId,
    comment_text: "Test comment",
    comment_type: "general",
    created_by: dummyUserId,
    created_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase.from('ticket_comments').insert([payload]).select();
  console.log("Insert result:", data);
  console.log("Error details:", error);
}
run();
