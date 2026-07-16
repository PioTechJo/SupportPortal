
  SELECT p.proname, pg_get_function_identity_arguments(p.oid) as args
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' 
  AND p.proname IN ('auth_user_customer_id', 'auth_user_role_name', 'is_internal_role');
