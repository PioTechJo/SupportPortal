const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = "https://ybacrvdkbgljdykdogpz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_iGtlYcPTXQlu6dSpI-tKbQ_4naHYgD_";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const { data: customers } = await supabase.from('customers').select('*');
  console.log("CUSTOMERS:", JSON.stringify(customers, null, 2));

  const { data: products } = await supabase.from('products').select('*');
  console.log("PRODUCTS:", JSON.stringify(products, null, 2));

  const { data: ticket_statuses } = await supabase.from('ticket_statuses').select('*');
  console.log("TICKET_STATUSES:", JSON.stringify(ticket_statuses, null, 2));

  const { data: priorities } = await supabase.from('priorities').select('*');
  console.log("PRIORITIES:", JSON.stringify(priorities, null, 2));
}
run();
