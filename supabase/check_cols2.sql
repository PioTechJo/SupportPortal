SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('ai_diagnostic_questions', 'ai_question_options');
