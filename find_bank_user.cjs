const { execSync } = require('child_process');

const query = `
  SELECT u.email, u.id as user_id, c.customer_name, r.role_code 
  FROM users u 
  JOIN roles r ON u.role_id = r.id 
  LEFT JOIN customers c ON u.customer_id = c.id
  WHERE r.role_code IN ('BANK_USER', 'BANK_ADMIN', 'BANK_MANAGER')
  LIMIT 1;
`;

const fs = require('fs');
fs.writeFileSync('temp_find_bank_user.sql', query);
try {
  const output = execSync('npx supabase db query -f temp_find_bank_user.sql --linked', { encoding: 'utf-8' });
  console.log(output);
} catch (e) {
  console.error(e.message);
}
