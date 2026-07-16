-- Check 1: Does the RPC exist?
SELECT proname, pronargs FROM pg_proc WHERE proname = 'get_dashboard_analytics';
