-- What product names do the tickets actually join to?
SELECT 
  p.product_name,
  COUNT(*) as ticket_count
FROM tickets t
LEFT JOIN products p ON t.product_id = p.id
GROUP BY p.product_name
ORDER BY ticket_count DESC
LIMIT 15;
