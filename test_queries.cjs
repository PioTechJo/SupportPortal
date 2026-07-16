const { createClient } = require('@supabase/supabase-js');

// Assuming we can read the env from somewhere or use the anon key
require('dotenv').config({ path: '.env.local' });
// Actually we can just run the query using the CLI like we did before!
const { execSync } = require('child_process');

function runQuery(query) {
  const fs = require('fs');
  fs.writeFileSync('temp_test_query.sql', query);
  const output = execSync(`npx supabase db query -f temp_test_query.sql --linked`, { encoding: 'utf-8' });
  return output;
}

try {
  // We can't test PostgREST syntax via SQL directly.
  // But we can check if the columns exist.
  console.log("Checking customers.country...");
  console.log(runQuery(`SELECT column_name FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'country'`));
  
  console.log("Checking tickets foreign keys...");
  console.log(runQuery(`
    SELECT
      tc.table_name, 
      kcu.column_name, 
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      tc.constraint_name
    FROM 
      information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name='tickets';
  `));
} catch(e) {
  console.error(e.message);
}
