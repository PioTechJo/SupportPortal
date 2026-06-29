const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ybacrvdkbgljdykdogpz.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_iGtlYcPTXQlu6dSpI-tKbQ_4naHYgD_';

async function run() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/?apikey=${SUPABASE_ANON_KEY}`, {
    headers: {
      'Accept': 'application/openapi+json'
    }
  });
  const spec = await res.json();
  const table = spec.definitions?.priorities || spec.components?.schemas?.priorities;
  console.log(JSON.stringify(table, null, 2));
}
run();
