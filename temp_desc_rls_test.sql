-- Query 1: Raw service role access (no RLS)
SELECT id, legacy_ticket_id, description, subject 
FROM tickets 
WHERE legacy_ticket_id = '17731';

-- Query 2: Simulate authenticated role (RLS applied)
SET LOCAL ROLE authenticated;
SELECT description FROM tickets WHERE legacy_ticket_id = '17731';
RESET ROLE;
