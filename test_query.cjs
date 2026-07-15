const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = "https://ybacrvdkbgljdykdogpz.supabase.co";
const supabaseKey = "sb_publishable_iGtlYcPTXQlu6dSpI-tKbQ_4naHYgD_";
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .in('action_type', ['TICKET_CLOSED', 'RESOLUTION_APPROVED', 'RESOLUTION_SUBMITTED', 'STATUS_CHANGE'])
    .order('created_at', { ascending: false })
    .limit(10);
  console.log("Recent Audit Logs:", JSON.stringify(data, null, 2));
  if (error) console.log("Error:", error);
}
check();
