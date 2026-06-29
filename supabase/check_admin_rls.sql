BEGIN;

SELECT set_config(
  'request.jwt.claims',
  '{"sub": "8066aa61-7985-4be8-92cc-490b0d3f4b95", "role": "authenticated"}',
  true
);

SELECT 
  auth.uid() AS "auth.uid()",
  auth_user_role_name() AS "auth_user_role_name()",
  auth_user_customer_id() AS "auth_user_customer_id()",
  u.id AS user_id, 
  u.email, 
  u.role_id, 
  r.role_name AS db_role_name
FROM public.users u
JOIN public.roles r ON u.role_id = r.id
WHERE u.id = '8066aa61-7985-4be8-92cc-490b0d3f4b95';

ROLLBACK;
