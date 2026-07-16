-- Test customers table as anon role (what supabaseAnon uses)
SET LOCAL ROLE anon;
SELECT id, customer_name, country FROM customers ORDER BY customer_name LIMIT 5;
