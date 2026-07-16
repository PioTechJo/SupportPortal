const SUPABASE_URL = "https://ybacrvdkbgljdykdogpz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_iGtlYcPTXQlu6dSpI-tKbQ_4naHYgD_";

async function run() {
  const headers = { 
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    "Cache-Control": "no-cache",
    Pragma: "no-cache"
  };

  const url = `${SUPABASE_URL}/rest/v1/products?select=*`;
  console.log("Fetching products:", url);
  
  const res = await fetch(url, { headers });
  const data = await res.json();
  
  console.log("Products returned:", Array.isArray(data) ? data.length : data);
  if (Array.isArray(data)) {
    const fatca = data.find(p => p.product_name === 'BankBI-FATCA' || p.product_code === 'BankBI-FATCA');
    console.log("FATCA in DB?", fatca ? "YES" : "NO");
  }
}
run();
