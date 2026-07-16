-- Check 2: RLS policies on customers table
SELECT policyname, roles, cmd, qual FROM pg_policies WHERE tablename = 'customers';
