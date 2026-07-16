const { execSync } = require('child_process');
const fs = require('fs');

const query = `
BEGIN;
-- Mock an authenticated session
SET LOCAL role authenticated;
-- We need to mock auth.uid(). Since auth.uid() reads from current_setting('request.jwt.claims', true), we set it.
-- Use any valid user UUID from users table, for example the admin user we used earlier.
-- We can fetch one first, but let's just use a dummy valid UUID for testing syntax, or let's fetch an admin UUID.
DO $$ 
DECLARE admin_id uuid;
BEGIN
  SELECT id INTO admin_id FROM users u JOIN roles r ON u.role_id = r.id WHERE r.role_code = 'ADMIN' LIMIT 1;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', admin_id)::text, true);
END $$;

EXPLAIN ANALYZE
SELECT
  t.*
FROM tickets t
ORDER BY created_at DESC
LIMIT 50 OFFSET 0;

COMMIT;
`;

fs.writeFileSync('temp_explain.sql', query);
try {
  console.time('ExplainQuery');
  const output = execSync('npx supabase db query -f temp_explain.sql --linked', { encoding: 'utf-8' });
  console.timeEnd('ExplainQuery');
  console.log(output);
} catch (e) {
  console.error(e.message);
}
