SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname IN ('tickets', 'ticket_comments');
