require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRpc() {
  console.log('Logging in as Admin...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@pio-tech.com',
    password: '123'
  });

  if (authError) {
    console.error('Login failed:', authError.message);
    return;
  }
  
  console.log('Login successful. Calling RPC...');
  
  const fromDate = '2020-01-01';
  const toDate = '2026-12-31';
  
  const { data: rpcData, error: rpcError } = await supabase.rpc('get_dashboard_analytics', {
    p_from_date: fromDate,
    p_to_date: toDate,
    p_customer_ids: [],
    p_engineer_ids: []
  });
  
  if (rpcError) {
    console.error('RPC Error:', rpcError);
    return;
  }
  
  console.log('=============================');
  console.log('RPC RESULTS (ADMIN)');
  console.log('=============================');
  console.log('Metrics:', rpcData.metrics);
  console.log('Tickets by Bank count:', rpcData.ticketsByBank.length);
  console.log('Tickets by Product count:', rpcData.ticketsByProduct.length);
  console.log('Engineer Performance count:', rpcData.engineerPerformance.length);
  console.log('Escalations count:', rpcData.escalations.length);
  console.log('=============================');
}

testRpc();
