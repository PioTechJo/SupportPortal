const { execSync } = require('child_process');

const query = `
  SELECT id, role_code, role_name FROM roles;
`;

const fs = require('fs');
fs.writeFileSync('temp_find_roles.sql', query);
try {
  const output = execSync('npx supabase db query -f temp_find_roles.sql --linked', { encoding: 'utf-8' });
  console.log(output);
} catch (e) {
  console.error(e.message);
}
