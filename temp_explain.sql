
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
