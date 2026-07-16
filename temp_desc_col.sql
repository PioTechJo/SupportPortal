-- Bug 1: Find the EXACT description column name(s)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tickets' 
AND table_schema = 'public'
AND column_name ILIKE '%descri%'
ORDER BY column_name;
