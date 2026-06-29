const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = "https://ybacrvdkbgljdykdogpz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_iGtlYcPTXQlu6dSpI-tKbQ_4naHYgD_";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const uuid = "e76da6c8-5dc6-48be-85b5-e6a8e3cbef8b";
  
  // Test 1: Try inserting with role_id and customer_id
  console.log("Test 1: Inserting with role_id and customer_id...");
  const { data: d1, error: e1 } = await supabase
    .from('users')
    .insert([{ 
      id: uuid, 
      email: 'test_uuid@example.com', 
      full_name: 'Test UUID User',
      role_id: null,
      customer_id: null,
      created_at: new Date().toISOString()
    }])
    .select();
  console.log("Result 1:", { d1, e1 });

  // Test 2: Try inserting with role and tenant_id
  console.log("Test 2: Inserting with role and tenant_id...");
  const { data: d2, error: e2 } = await supabase
    .from('users')
    .insert([{ 
      id: uuid, 
      email: 'test_uuid@example.com', 
      full_name: 'Test UUID User',
      role: 'agent',
      tenant_id: 't-riyadh',
      created_at: new Date().toISOString()
    }])
    .select();
  console.log("Result 2:", { d2, e2 });
}
run();
