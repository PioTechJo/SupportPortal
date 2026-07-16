-- Check RLS policies on tickets table to see if description column could be affected
-- Also check if there's a view or function wrapping tickets
SELECT policyname, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'tickets'
ORDER BY cmd, policyname;
