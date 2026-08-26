-- Per the latest business notes:
--   - "Bank request" (new ticket) notice must reach the Pio-Tech Support team.
--   - "Ticket assigned" notice must reach the Support team, the assigned
--     resource, AND the bank team together.

UPDATE public.email_templates
SET recipient_roles = '["admin", "support_group"]'
WHERE trigger_key = 'NEW_TICKET_ADMIN';

UPDATE public.email_templates
SET recipient_roles = '["assignee", "support_group", "customer"]'
WHERE trigger_key = 'TICKET_ASSIGNED_ENGINEER';
