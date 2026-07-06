import { createClient } from '@supabase/supabase-js';

// use local dummy anon key and url if possible, or we just rely on standard env
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'dummy';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const selectStr = '*, product:products!product_id(id, product_code, product_name, description, icon, color, display_order, is_active)';
  const { data, error } = await supabase
    .from('organization_products')
    .select(selectStr)
    .limit(1);

  if (error) {
    console.error("ERROR:", error);
  } else {
    console.log("DATA:", JSON.stringify(data, null, 2));
  }
}

test();
