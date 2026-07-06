const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = "https://ybacrvdkbgljdykdogpz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_iGtlYcPTXQlu6dSpI-tKbQ_4naHYgD_";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  console.log("Signing in as Admin...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'haitham.m.n@gmail.com',
    password: 'password'
  });

  if (authError) {
    console.error("Sign in failed:", authError.message);
    return;
  }
  
  console.log("Fetching internal escalations via Supabase JS client...");
  
  const { data, error } = await supabase
    .from('ticket_comments')
    .select(`
      id,
      ticket_id,
      created_at,
      escalated_team_id,
      escalated_developer_name,
      escalation_returned_at,
      is_internal,
      is_system_generated,
      teams ( team_name ),
      tickets ( customer_id, tenant_id, assigned_to, ticket_no, subject )
    `)
    .eq('is_internal', true);

  console.log("Raw Data:", JSON.stringify(data, null, 2));
  if (error) {
    console.error("Query Error:", error.message);
  } else {
    console.log("Result Count:", data?.length || 0);
  }
}
run();
