const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = "https://ybacrvdkbgljdykdogpz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_iGtlYcPTXQlu6dSpI-tKbQ_4naHYgD_";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testColumn(colName) {
  const payload = {
    ticket_id: '00000000-0000-0000-0000-000000000000',
    comment_text: "Test",
    comment_type: "general"
  };
  payload[colName] = '00000000-0000-0000-0000-000000000000';
  
  const { data, error } = await supabase.from('ticket_comments').insert([payload]).select();
  if (error && error.message.includes("Could not find the '" + colName + "' column")) {
    return false;
  }
  console.log("Column '" + colName + "' test result:", { data, error });
  return true;
}

async function run() {
  const cols = ['author_id', 'user_id', 'creator_id', 'sender_id', 'profile_id', 'created_by_id'];
  for (const col of cols) {
    const exists = await testColumn(col);
    if (exists) {
      console.log("SUCCESS! Column exists: " + col);
    }
  }
}
run();
