SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('recommendation_rules', 'ai_recommendations');
