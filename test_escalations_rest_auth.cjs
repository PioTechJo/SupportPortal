const SUPABASE_URL = "https://ybacrvdkbgljdykdogpz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_iGtlYcPTXQlu6dSpI-tKbQ_4naHYgD_";

async function run() {
  console.log("Signing in as Admin...");
  const authRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'haitham.m.n@gmail.com',
      password: 'password'
    })
  });

  const authData = await authRes.json();
  if (!authRes.ok) {
    console.error("Sign in failed:", authData);
    return;
  }
  
  const token = authData.access_token;
  console.log("Sign in successful!");
  
  console.log("Fetching internal escalations using REST API...");
  // Note: we remove tenant_id since it doesn't exist on tickets table
  const url = `${SUPABASE_URL}/rest/v1/ticket_comments?select=id,ticket_id,created_at,escalated_team_id,escalated_developer_name,escalation_returned_at,is_internal,is_system_generated,teams(team_name),tickets(customer_id,assigned_to,ticket_no,subject)&is_internal=eq.true`;
  
  try {
    const res = await fetch(url, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`
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
