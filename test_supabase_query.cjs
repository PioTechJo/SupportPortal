const { createClient } = require('@supabase/supabase-js');
global.WebSocket = require('ws');

const SUPABASE_URL = "https://ybacrvdkbgljdykdogpz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_iGtlYcPTXQlu6dSpI-tKbQ_4naHYgD_";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testQueries() {
  console.log("Testing customers query...");
  const { data: cData, error: cError } = await supabase
    .from('customers')
    .select('*', { count: 'exact' })
    .range(0, 49)
    .order('customer_name', { ascending: true });
    
  if (cError) {
    console.error("Customers Error:", cError);
  } else {
    console.log("Customers returned:", cData.length, "rows");
  }

  console.log("Testing tickets query...");
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

  if (tError) {
    console.error("Tickets Error:", tError);
  } else {
    console.log("Tickets returned:", tData.length, "rows");
  }
}

testQueries().catch(console.error);
