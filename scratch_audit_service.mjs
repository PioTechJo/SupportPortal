import fs from 'fs';

const envFile = fs.readFileSync('.env.example', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const SUPABASE_URL = env['VITE_SUPABASE_URL'];
const SUPABASE_SERVICE_ROLE_KEY = env['SUPABASE_SERVICE_ROLE_KEY'];

async function run() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/audit_log?select=*&limit=1`, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
    }
  });
  const data = await res.json();
  if (Array.isArray(data) && data.length > 0) {
    console.log("Columns:", Object.keys(data[0]));
  } else {
    // try to fetch OpenAPI schema using service key
    const res2 = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });
    const data2 = await res2.json();
    console.log("Schema Columns:", Object.keys(data2.definitions.audit_log.properties));
  }
}
run().catch(console.error);
