SELECT 
  policyname AS policy_name,
  cmd AS command,
  roles,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies 
WHERE tablename = 'tickets' 
  AND policyname IN ('Tickets read admin', 'Tickets read customer');
