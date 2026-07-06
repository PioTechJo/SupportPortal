const SUPABASE_URL = "https://ybacrvdkbgljdykdogpz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_iGtlYcPTXQlu6dSpI-tKbQ_4naHYgD_";

async function run() {
  console.log("Fetching internal escalations using REST API...");
  const url = `${SUPABASE_URL}/rest/v1/ticket_comments?select=id,ticket_id,created_at,escalated_team_id,escalated_developer_name,escalation_returned_at,is_internal,is_system_generated,teams(team_name),tickets(customer_id,assigned_to,ticket_no,subject)&is_internal=eq.true`;
  
  try {
    const res = await fetch(url, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    
    if (!res.ok) {
      const text = await res.text();
      console.error("HTTP Error:", res.status, res.statusText, text);
      return;
    }
    
    const data = await res.json();
    console.log("Raw Data:", JSON.stringify(data, null, 2));
    console.log("Result Count:", data.length);
  } catch(e) {
    console.error("Fetch Error:", e);
  }
}
run();
