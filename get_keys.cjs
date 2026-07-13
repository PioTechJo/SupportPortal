const SUPABASE_URL = "https://ybacrvdkbgljdykdogpz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_iGtlYcPTXQlu6dSpI-tKbQ_4naHYgD_";

async function run() {
  const headers = { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` };
  const res = await fetch(`${SUPABASE_URL}/rest/v1/users?select=*&limit=1`, { headers });
  const data = await res.json();
  console.log("Users table keys:", data.length > 0 ? Object.keys(data[0]) : "No data");
}
run();
