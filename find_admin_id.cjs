const { execSync } = require('child_process');

const query = `
  SELECT id FROM users WHERE email = 'admin@pio-tech.com';
`;

const fs = require('fs');
fs.writeFileSync('temp_find_admin_id.sql', query);
try {
  const output = execSync('npx supabase db query -f temp_find_admin_id.sql --linked', { encoding: 'utf-8' });
  console.log(output);
} catch (e) {
  console.error(e.message);
}
