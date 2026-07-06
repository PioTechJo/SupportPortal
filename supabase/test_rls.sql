BEGIN;

CREATE TEMP TABLE test_results (
  test_case text,
  comments_count int
);
GRANT ALL ON test_results TO authenticated;

-- Make User A a Standard User temporarily
UPDATE public.users SET role_id = (SELECT id FROM public.roles WHERE role_code = 'USER' LIMIT 1) 
WHERE id = '8066aa61-7985-4be8-92cc-490b0d3f4b95';

-- Test User A (Org A) looking at Org B's ticket
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = '{"sub": "8066aa61-7985-4be8-92cc-490b0d3f4b95", "role": "authenticated"}';
INSERT INTO test_results SELECT 'User A (Org A)', COUNT(*) FROM public.ticket_comments WHERE ticket_id = 'b4808d09-ac3e-4c92-8f98-8d3574ca4b63';
RESET role;
RESET request.jwt.claims;

-- Test User B (Org B) looking at their own ticket
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = '{"sub": "e107f603-95e5-4eb0-8bee-ea224af6a41c", "role": "authenticated"}';
INSERT INTO test_results SELECT 'User B (Org B)', COUNT(*) FROM public.ticket_comments WHERE ticket_id = 'b4808d09-ac3e-4c92-8f98-8d3574ca4b63';
RESET role;
RESET request.jwt.claims;

SELECT * FROM test_results;
ROLLBACK;
