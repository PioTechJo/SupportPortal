SELECT 
    table_name, 
    column_name, 
    data_type, 
    column_default, 
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name IN (
    'products', 
    'tickets', 
    'ticket_answers', 
    'recommendation_rules', 
    'ticket_comments'
  )
ORDER BY table_name, ordinal_position;
