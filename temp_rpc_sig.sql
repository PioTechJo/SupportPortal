-- Get exact parameter types of get_dashboard_analytics
SELECT 
  p.proname,
  pg_get_function_arguments(p.oid) AS arguments,
  pg_get_function_result(p.oid) AS return_type
FROM pg_proc p
WHERE p.proname = 'get_dashboard_analytics';
