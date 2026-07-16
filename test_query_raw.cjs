const SUPABASE_URL = "https://ybacrvdkbgljdykdogpz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_iGtlYcPTXQlu6dSpI-tKbQ_4naHYgD_";

async function run() {
  const headers = { 
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`
  };

  const cRes = await fetch(`${SUPABASE_URL}/rest/v1/customers?select=id,customer_code&customer_code=eq.CAB`, { headers });
  const cData = await cRes.json();
  const cabId = cData[0].id;
  
  const orgUrl = `${SUPABASE_URL}/rest/v1/organization_products?organization_id=eq.${cabId}`;
  
  const orgRes = await fetch(orgUrl, { headers });
  const orgData = await orgRes.json();
  
  console.log("\n--- RESULT WITHOUT JOIN OR ACTIVE FILTER ---");
  console.log(JSON.stringify(orgData, null, 2));
}
run();
