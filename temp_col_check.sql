-- Check actual column names in tickets to confirm 'description' vs 'subject'
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tickets' 
AND table_schema = 'public'
AND column_name IN ('description', 'subject', 'title', 'problem_description', 'body')
ORDER BY column_name;
