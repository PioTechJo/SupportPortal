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
  
  const allProducts = (data || []).map((p) => ({
    ...p,
    name: p.product_name || p.name || p.product_code || ''
  }));

  const searchTerm = "BankBI-FATCA";
  
  const filteredProducts = allProducts.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  console.log("Total mapped products:", allProducts.length);
  console.log("Filtered products for 'BankBI-FATCA':", filteredProducts.length);
  if(filteredProducts.length > 0) {
      console.log("First filtered:", filteredProducts[0].name);
  } else {
      // Find what DOES exist
      const fatca = allProducts.find(p => p.name.includes("FATCA"));
      console.log("But FATCA exists as:", fatca ? `"${fatca.name}"` : "Not found at all");
  }
}
run();
