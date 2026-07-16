const { execSync } = require('child_process');

const query = `
  SELECT u.email, r.role_code 
  FROM users u 
  JOIN roles r ON u.role_id = r.id;
`;

const fs = require('fs');
fs.writeFileSync('temp_find_any_user.sql', query);
try {
  const output = execSync('npx supabase db query -f temp_find_any_user.sql --linked', { encoding: 'utf-8' });
  console.log(output);
} catch (e) {
  console.error(e.message);
}
