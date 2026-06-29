BEGIN;

SELECT set_config(
  'request.jwt.claims',
  '{"sub": "8066aa61-7985-4be8-92cc-490b0d3f4b95", "role": "authenticated"}',
  true
);

SELECT 
  auth.uid() AS "auth.uid()",
  auth_user_role_name() AS "auth_user_role_name()",
  (SELECT count(*) FROM public.tickets) AS accessible_tickets_count;

ROLLBACK;
