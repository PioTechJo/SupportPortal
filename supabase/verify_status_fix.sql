-- (a) Check tickets.status column
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'tickets' AND column_name = 'status';

-- (b) Check ticket_statuses rows and sort_order
SELECT status_code, status_name, sort_order 
FROM ticket_statuses 
ORDER BY sort_order;

-- (c) Check existing ticket's status_id (assuming tickets exist)
SELECT t.id, ts.status_code
FROM tickets t
JOIN ticket_statuses ts ON t.status_id = ts.id
LIMIT 5;
