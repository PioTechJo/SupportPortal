-- Table Row Counts
SELECT
  relname as table_name,
  reltuples as row_count
FROM pg_class C
LEFT JOIN pg_namespace N ON (N.oid = C.relnamespace)
WHERE nspname = 'public' AND relkind = 'r'
ORDER BY reltuples DESC;

-- RLS Policies
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'public';

-- Functions
SELECT proname, prosrc 
FROM pg_proc p 
JOIN pg_namespace n ON p.pronamespace = n.oid 
WHERE n.nspname = 'public';

-- Triggers
SELECT event_object_table, trigger_name, event_manipulation, action_statement 
FROM information_schema.triggers 
WHERE trigger_schema = 'public';

-- Views
SELECT table_name as view_name 
FROM information_schema.views 
WHERE table_schema = 'public';
