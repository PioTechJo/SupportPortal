const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ybacrvdkbgljdykdogpz.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_iGtlYcPTXQlu6dSpI-tKbQ_4naHYgD_';

async function fetchTable(table) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`
    }
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Failed to fetch ${table}: ${res.status} ${txt}`);
  }
  return await res.json();
}

async function run() {
  const tables = ['customers', 'products', 'priorities', 'customer_products', 'ticket_statuses', 'roles'];

  for (const table of tables) {
    console.log(`\n=== TABLE: ${table} ===`);
    let rows = [];
    try {
      rows = await fetchTable(table);
    } catch (e) {
      console.log(e.message);
      continue;
    }

    console.log(`1. Total rows: ${rows.length}`);
    console.log(`3. Is Empty: ${rows.length === 0}`);

    if (rows.length > 0) {
      console.log(`2. Sample rows:`);
      rows.slice(0, 3).forEach(r => {
        const id = r.id;
        const code = r.customer_code || r.product_code || r.priority_code || r.status_code || r.role_name || r.name || 'N/A';
        const name = r.customer_name || r.product_name || r.priority_name || r.status_name || r.role_name || r.name || 'N/A';
        console.log(`   - ID: ${id} | Code: ${code} | Name: ${name}`);
      });
      
      // Duplicates check
      const codes = rows.map(r => r.customer_code || r.product_code || r.priority_code || r.status_code || r.role_name || r.name || null).filter(c => c !== null);
      const uniqueCodes = new Set(codes);
      console.log(`4. Duplicate business codes: ${codes.length !== uniqueCodes.size}`);

      // NULLs check
      let hasNulls = false;
      rows.forEach(r => {
        if (
          (table === 'customers' && (!r.customer_code || !r.customer_name)) ||
          (table === 'products' && (!r.product_code || !r.product_name)) ||
          (table === 'priorities' && (!r.priority_code || !r.priority_name)) ||
          (table === 'ticket_statuses' && (!r.status_code || !r.status_name)) ||
          (table === 'roles' && !r.role_name)
        ) {
          hasNulls = true;
        }
      });
      console.log(`5. Null values in required business columns: ${hasNulls}`);
      
      if (table === 'customer_products') {
        const c_ids = rows.map(r => r.customer_id);
        const p_ids = rows.map(r => r.product_id);
        
        let missingFk = false;
        try {
          const cData = await fetchTable('customers');
          const pData = await fetchTable('products');
          const valid_c = new Set((cData || []).map(x => x.id));
          const valid_p = new Set((pData || []).map(x => x.id));
          
          rows.forEach(r => {
            if (!valid_c.has(r.customer_id) || !valid_p.has(r.product_id)) missingFk = true;
          });
        } catch (e) {
            console.log('Error verifying FKs:', e.message);
        }
        console.log(`6. Foreign keys reference missing records: ${missingFk}`);
      } else {
        console.log(`6. Foreign keys reference missing records: N/A`);
      }
    } else {
      console.log(`2. Sample rows: None`);
      console.log(`4. Duplicate business codes: N/A`);
      console.log(`5. Null values in required business columns: N/A`);
      console.log(`6. Foreign keys reference missing records: N/A`);
    }
  }
}
run();
