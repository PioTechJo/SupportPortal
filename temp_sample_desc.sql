-- Sample 5 random legacy tickets for description check
SELECT legacy_ticket_id, 
       CASE WHEN description IS NULL THEN 'NULL' 
            WHEN description = '' THEN 'EMPTY'
            ELSE 'POPULATED (' || LENGTH(description)::text || ' chars)'
       END AS description_status,
       LEFT(description, 80) AS description_preview
FROM tickets
WHERE legacy_ticket_id IS NOT NULL
ORDER BY RANDOM()
LIMIT 5;
