const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = "https://ybacrvdkbgljdykdogpz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_iGtlYcPTXQlu6dSpI-tKbQ_4naHYgD_";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const uuid = "e76da6c8-5dc6-48be-85b5-e6a8e3cbef8b";
  console.log("Trying to insert into 'users' with valid UUID...");
  const { data, error } = await supabase
    .from('users')
    .insert([{ 
      id: uuid, 
      email: 'test_uuid@example.com', 
      full_name: 'Test UUID User',
      created_at: new Date().toISOString()
    }])
    .select();
  console.log("Insert Result:", { data, error });
}
run();
