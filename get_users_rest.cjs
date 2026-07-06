const SUPABASE_URL = "https://ybacrvdkbgljdykdogpz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_iGtlYcPTXQlu6dSpI-tKbQ_4naHYgD_";

async function run() {
  console.log("Fetching users using REST API...");
  const url = `${SUPABASE_URL}/rest/v1/users?select=*`;
  
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
    console.log("Users Data:", JSON.stringify(data.map(u => u.email), null, 2));
  } catch(e) {
    console.error("Fetch Error:", e);
  }
}
run();
