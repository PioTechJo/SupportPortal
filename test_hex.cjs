const SUPABASE_URL = "https://ybacrvdkbgljdykdogpz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_iGtlYcPTXQlu6dSpI-tKbQ_4naHYgD_";

async function run() {
  const headers = { 
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  };

  const pUrl = `${SUPABASE_URL}/rest/v1/products?select=*`;
  const pRes = await fetch(pUrl, { headers });
  const data = await pRes.json();
  
  const fatca = data.find(p => p.product_code === "BankBI-FATCA");
  if (fatca) {
      console.log("FATCA Code Hex:", Buffer.from(fatca.product_code).toString('hex'));
      console.log("FATCA Name Hex:", Buffer.from(fatca.product_name).toString('hex'));
      console.log("Expected Hex:  ", Buffer.from("BankBI-FATCA").toString('hex'));
  }
}
run();
