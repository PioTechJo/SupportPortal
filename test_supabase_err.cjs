const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = "https://ybacrvdkbgljdykdogpz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_iGtlYcPTXQlu6dSpI-tKbQ_4naHYgD_";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false }
});

async function run() {
  const selectStr = `*, product:products(id, product_code, product_name, description, icon, color, display_order, is_active)`;
  
  try {
    const { data, error } = await supabase
      .from('organization_products')
      .select(selectStr)
      .eq('organization_id', '09086445-3681-4343-af80-53ad29e6f93e')
      .eq('is_active', true);
      
    if (error) {
      console.error("Supabase Error Object:", error);
    } else {
      console.log("Supabase Data:", data);
    }
  } catch (err) {
    console.error("Supabase Exception:", err);
  }
}
run();
