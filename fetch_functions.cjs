const { execSync } = require('child_process');

const query = `
  SELECT p.proname, p.prosrc, p.provolatile 
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' 
  AND p.proname IN ('auth_user_customer_id', 'current_customer_id', 'auth_user_role_name', 'is_internal_role');
`;

const fs = require('fs');
fs.writeFileSync('temp_func_query.sql', query);
try {
  const output = execSync('npx supabase db query -f temp_func_query.sql --linked', { encoding: 'utf-8' });
  console.log(output);
} catch (e) {
  console.error(e.message);
}
