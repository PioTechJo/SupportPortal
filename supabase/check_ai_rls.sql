SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tickets';

SELECT policyname, cmd FROM pg_policies 
WHERE tablename = 'ai_recommendations';
