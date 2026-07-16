-- Check if there's a VIEW called 'tickets' that wraps the base table and might exclude description
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_name = 'tickets' AND table_schema = 'public';

-- Also check view definition if it exists
SELECT viewname, definition 
FROM pg_views 
WHERE viewname = 'tickets' AND schemaname = 'public';
