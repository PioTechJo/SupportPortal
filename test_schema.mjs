const SUPABASE_URL = 'https://ybacrvdkbgljdykdogpz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_iGtlYcPTXQlu6dSpI-tKbQ_4naHYgD_';

async function run() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/?apikey=${SUPABASE_ANON_KEY}`);
  const data = await res.json();
  if (data && data.definitions && data.definitions.audit_log) {
    console.log("audit_log columns:", Object.keys(data.definitions.audit_log.properties));
  } else {
    console.log("Could not find audit_log in definitions. Keys available:", Object.keys(data.definitions || {}));
  }
}
run();
