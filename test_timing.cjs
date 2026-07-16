const { createClient } = require('@supabase/supabase-js');
global.WebSocket = require('ws');

const SUPABASE_URL = "https://ybacrvdkbgljdykdogpz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_iGtlYcPTXQlu6dSpI-tKbQ_4naHYgD_";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false
  }
});

async function testQueryTiming() {
  console.log("Logging in as admin...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@pio-tech.com',
    password: '123'
  });

  if (authError) {
    console.error("Auth error:", authError);
    return;
  }

  console.log("Logged in. Testing tickets query with STABLE fix...");
  const startTime = Date.now();
  
  const { data: tData, error: tError } = await supabase
    .from('tickets')
    .select(`
      *,
      ticket_statuses(status_code, status_name),
      customers(customer_name),
      products(product_name, product_code),
      priorities(priority_name),
      creator:users!created_by(full_name),
      diagnostic_category:ai_diagnostic_categories(category_name, category_name_ar)
    `, { count: 'exact' })
    .range(0, 49)
    .order('created_at', { ascending: false });

  const endTime = Date.now();

  if (tError) {
    console.error("Tickets Error:", tError);
  } else {
    console.log(`Success! Fetched ${tData.length} tickets.`);
    console.log(`Execution Time: ${endTime - startTime}ms`);
  }
}

testQueryTiming().catch(console.error);
