const { execSync } = require('child_process');

const query = `
  -- Simulate Admin Login
  SET ROLE authenticated;
  SET request.jwt.claims = '{"email": "admin@pio-tech.com", "role": "authenticated", "sub": "8066aa61-7985-4be8-92cc-490b0d3f4b95"}';
  
  -- Call RPC
  SELECT get_dashboard_analytics('2020-01-01', '2026-12-31');
`;

const fs = require('fs');
fs.writeFileSync('temp_test_rpc.sql', query);
try {
  const output = execSync('npx supabase db query -f temp_test_rpc.sql --linked', { encoding: 'utf-8' });
  console.log(output);
} catch (e) {
  console.error(e.message);
}
