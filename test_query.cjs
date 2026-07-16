const SUPABASE_URL = "https://ybacrvdkbgljdykdogpz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_iGtlYcPTXQlu6dSpI-tKbQ_4naHYgD_";

async function run() {
  const headers = { 
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    "Cache-Control": "no-cache",
    Pragma: "no-cache"
  };

  // 1. Get Cairo Amman Bank's ID
  const cRes = await fetch(`${SUPABASE_URL}/rest/v1/customers?select=id,customer_code&customer_code=eq.CAB`, { headers });
  const cData = await cRes.json();
  const cabId = cData[0].id;
  
  // 2. Fetch organization_products with join
  const selectStr = `*, product:products(id, product_code, product_name, description, icon, color, display_order, is_active)`;
  const orgUrl = `${SUPABASE_URL}/rest/v1/organization_products?select=${encodeURIComponent(selectStr)}&organization_id=eq.${cabId}&is_active=eq.true`;
  
  console.log("Fetching:", orgUrl);
  
  const orgRes = await fetch(orgUrl, { headers });
  const orgData = await orgRes.json();
  
  console.log("\n--- RESULT ---");
  console.log(JSON.stringify(orgData, null, 2));
}
run();
