const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = "https://ybacrvdkbgljdykdogpz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_iGtlYcPTXQlu6dSpI-tKbQ_4naHYgD_";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'admin@pio-tech.com',
    password: 'password'
  });
  
  if (authErr) {
    console.log("Auth Error:", authErr);
    return;
  }
  
  const ticketPayload = {
    subject: "Test Ticket",
    description: "Testing",
    created_by: authData.user.id
  };
  
  const { data: statusObj } = await supabase.from('ticket_statuses').select('id').eq('status_code', 'NEW').single();
  if (statusObj) ticketPayload.status_id = statusObj.id;
  
  const { data: cData } = await supabase.from('customers').select('id').eq('customer_code', 'PIOTECH').single();
  if (cData) ticketPayload.customer_id = cData.id;
  
  const { data, error } = await supabase.from('tickets').insert([ticketPayload]).select().single();
  console.log("Insert Error:", error);
  console.log("Insert Data:", data);
}

run();
