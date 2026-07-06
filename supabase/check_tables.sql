SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'ai_products', 
    'ai_symptoms', 
    'ai_question_templates', 
    'knowledge_articles', 
    'ai_knowledge_articles'
  );
