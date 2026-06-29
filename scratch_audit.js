const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ybacrvdkbgljdykdogpz.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_iGtlYcPTXQlu6dSpI-tKbQ_4naHYgD_';

async function run() {
  const res2 = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`
    }
  });
  const data2 = await res2.json();
  const table = Object.keys(data2.definitions).find(k => k.includes('audit'));
  console.log("Found table:", table);
  if (table) {
    console.log("Columns:", Object.keys(data2.definitions[table].properties));
  } else {
    console.log("No audit table found. All definitions:", Object.keys(data2.definitions));
  }
}
run();
