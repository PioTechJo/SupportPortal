const SUPABASE_URL = "https://ybacrvdkbgljdykdogpz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_iGtlYcPTXQlu6dSpI-tKbQ_4naHYgD_";
async function run() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/roles`, {
    method: 'OPTIONS',
    headers: { apikey: SUPABASE_ANON_KEY }
  });
  console.log(await res.text());
}
run();
