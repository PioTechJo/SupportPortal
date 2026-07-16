-- How many tickets have product_id populated vs NULL?
SELECT 
  COUNT(*) AS total_tickets,
  COUNT(product_id) AS with_product_id,
  COUNT(*) - COUNT(product_id) AS without_product_id
FROM tickets;
