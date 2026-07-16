-- Simulate authenticated role (RLS applied, no specific user JWT)
SET LOCAL ROLE authenticated;
SELECT description FROM tickets WHERE legacy_ticket_id = '17731';
