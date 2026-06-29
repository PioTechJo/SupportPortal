const SUPABASE_URL = 'https://ybacrvdkbgljdykdogpz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_iGtlYcPTXQlu6dSpI-tKbQ_4naHYgD_';

async function testColumn(col) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/audit_log?select=${col}&limit=1`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`
    }
  });
  const data = await res.json();
  if (res.ok) {
    console.log(`Column '${col}' EXISTS!`);
    return true;
  } else {
    // console.log(`Column '${col}' does not exist. Error:`, data);
    return false;
  }
}

async function run() {
  const candidates = ['created_at', 'timestamp', 'time', 'date', 'inserted_at', 'log_time', 'action_date', 'action_time', 'datetime'];
  for (const col of candidates) {
    const exists = await testColumn(col);
    if (exists) return;
  }
  console.log("None of the candidates matched. Testing select=* to see if there is any data.");
  const res = await fetch(`${SUPABASE_URL}/rest/v1/audit_log?select=*&limit=1`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`
    }
  });
  console.log(await res.json());
}
run();
