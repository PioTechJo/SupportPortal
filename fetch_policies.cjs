const { execSync } = require('child_process');
const fs = require('fs');

const query = `
  SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check 
  FROM pg_policies 
  WHERE schemaname = 'public' 
  AND tablename IN ('tickets', 'customers');
`;

fs.writeFileSync('temp_policy_query.sql', query);
try {
  const output = execSync('npx supabase db query -f temp_policy_query.sql --linked --format json', { encoding: 'utf-8' });
  const match = output.match(/\{[\s\S]*"rows":[\s\S]*\}/);
  if (match) {
    fs.writeFileSync('rls_policies_backup.json', match[0]);
    console.log("Policies backed up to rls_policies_backup.json");
  } else {
    console.log(output);
  }
} catch (e) {
  console.error(e.message);
}
