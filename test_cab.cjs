const SUPABASE_URL = "https://ybacrvdkbgljdykdogpz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_iGtlYcPTXQlu6dSpI-tKbQ_4naHYgD_";

async function run() {
  const headers = { 
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  };

  // 1. Get Cairo Amman Bank's ID
  const cRes = await fetch(`${SUPABASE_URL}/rest/v1/customers?select=id,customer_code&customer_code=eq.CAB`, { headers });
  const cData = await cRes.json();
  const cabId = cData[0].id;
  console.log("CAB ID:", cabId);

  // 2. Fetch organization_products
  const selectStr = `*, product:products(id, product_code, product_name, description, icon, color, display_order, is_active)`;
  const orgUrl = `${SUPABASE_URL}/rest/v1/organization_products?select=${encodeURIComponent(selectStr)}&organization_id=eq.${cabId}`;
  const orgRes = await fetch(orgUrl, { headers });
  const orgData = await orgRes.json();
  console.log("organization_products response:", JSON.stringify(orgData, null, 2));

  // 3. Fetch all products
  const pUrl = `${SUPABASE_URL}/rest/v1/products?select=*`;
  const pRes = await fetch(pUrl, { headers });
  const pData = await pRes.json();
  console.log("Products count:", pData.length);
}
run();
