const SUPABASE_URL = "https://ybacrvdkbgljdykdogpz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_iGtlYcPTXQlu6dSpI-tKbQ_4naHYgD_";

async function run() {
  const headers = { 
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  };

  const url = `${SUPABASE_URL}/rest/v1/organization_products?organization_id=eq.09086445-3681-4343-af80-53ad29e6f93e&limit=1`;
  const res = await fetch(url, { headers });
  const data = await res.json();
  
  if (data && data.length > 0) {
    console.log("Columns present in first row:", Object.keys(data[0]).join(', '));
  } else {
    console.log("Table is empty or unreadable.", data);
  }
}
run();
