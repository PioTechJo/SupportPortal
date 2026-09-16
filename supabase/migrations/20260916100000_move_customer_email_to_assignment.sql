-- The bank's ticket-creation email now fires at assignment time instead of
-- creation time (handled in code: TicketDetail.tsx dispatches
-- NEW_TICKET_CUSTOMER when the ticket is assigned). Add an "assigned" note
-- to that template's body, and remove "customer" from
-- TICKET_ASSIGNED_ENGINEER's recipients so the bank doesn't also get a
-- second, differently-worded email for the same event.

UPDATE public.email_templates
SET body_template = E'Dears,\n\nWe received your request ticket number {{ticket_no}}.\n\nIt is forwarded to the department in charge who will contact you soon to handle your request.\nPlease refer to the above ticket number for any future communication in relation to this issue.\n\nTickets Details:\n\nThe Ticket title is {{subject}} , And problem description is {{description}} .\n\n- Priority : {{priority}}\n- Expected Start Date : {{start_date}}\n- Expected End Date : {{end_date}}\n\nYour ticket has been assigned to our support team and is now being worked on.\n\nBest regards,\n\nPio-Tech Support Team'
WHERE trigger_key = 'NEW_TICKET_CUSTOMER';

UPDATE public.email_templates
SET recipient_roles = '["assignee", "support_group"]'
WHERE trigger_key = 'TICKET_ASSIGNED_ENGINEER';
