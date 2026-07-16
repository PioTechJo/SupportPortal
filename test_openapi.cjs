const SUPABASE_URL = "https://ybacrvdkbgljdykdogpz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_iGtlYcPTXQlu6dSpI-tKbQ_4naHYgD_";

async function run() {
  const headers = { 
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  };

  const url = `${SUPABASE_URL}/rest/v1/?apikey=${SUPABASE_ANON_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  
  const orgProdSchema = data.definitions;
  if(orgProdSchema && orgProdSchema.organization_products) {
    console.log("Cols via definitions:", Object.keys(orgProdSchema.organization_products.properties).join(', '));
  } else if (data.components && data.components.schemas && data.components.schemas.organization_products) {
    console.log("Cols via components:", Object.keys(data.components.schemas.organization_products.properties).join(', '));
  } else {
    console.log("Could not find schema. Keys are:", Object.keys(data));
  }
}
run();
