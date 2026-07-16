const SUPABASE_URL = "https://ybacrvdkbgljdykdogpz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_iGtlYcPTXQlu6dSpI-tKbQ_4naHYgD_";

async function run() {
  const headers = { 
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  };

  const url = `${SUPABASE_URL}/rest/v1/products?select=*`;
  const jRes = await fetch(url, { headers });
  const jData = await jRes.json();
  
  const mapped = jData.map(p => ({
    ...p,
    name: p.product_name || p.name || p.product_code || ''
  }));

  const fatca = mapped.find(p => p.name.includes("FATCA"));
  const bankbi = mapped.filter(p => p.name.includes("BankBI"));

  console.log("Found FATCA:", fatca ? `"${fatca.name}" (Code: ${fatca.product_code})` : "Not found");
  console.log("All BankBI products:");
  bankbi.forEach(p => console.log(`  "${p.name}" (Code: ${p.product_code})`));
}
run();
