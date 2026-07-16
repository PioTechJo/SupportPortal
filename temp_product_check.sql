-- Check: how many tickets have product_id populated vs NULL
SELECT 
  COUNT(*) AS total_tickets,
  COUNT(product_id) AS with_product_id,
  COUNT(*) - COUNT(product_id) AS without_product_id
FROM tickets;

-- Check: sample of tickets with their product_id and product_name
SELECT 
  t.id,
  t.legacy_ticket_id,
  t.product_id,
  p.product_name
FROM tickets t
LEFT JOIN products p ON t.product_id = p.id
WHERE t.product_id IS NOT NULL
LIMIT 5;

-- Check: how many distinct products exist
SELECT id, product_name FROM products ORDER BY product_name LIMIT 10;
