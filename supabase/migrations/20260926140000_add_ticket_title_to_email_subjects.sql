-- Every ticket notification email subject now carries the ticket number
-- followed by the ticket title/subject: "<ticket no> - <title>".

UPDATE public.email_templates SET subject_template = 'New ticket {{ticket_no}} - {{subject}}' WHERE trigger_key = 'NEW_TICKET_ADMIN';
UPDATE public.email_templates SET subject_template = 'Your ticket {{ticket_no}} - {{subject}} has been created on Pio-Tech Portal' WHERE trigger_key = 'NEW_TICKET_CUSTOMER';
UPDATE public.email_templates SET subject_template = 'You have been assigned to ticket {{ticket_no}} - {{subject}}' WHERE trigger_key = 'TICKET_ASSIGNED_ENGINEER';
UPDATE public.email_templates SET subject_template = 'You have been assigned an escalation for ticket {{ticket_no}} - {{subject}}' WHERE trigger_key = 'ESCALATION_DEVELOPER';
UPDATE public.email_templates SET subject_template = 'Management Escalation - Ticket {{ticket_no}} - {{subject}}' WHERE trigger_key = 'MANAGEMENT_ESCALATION';
UPDATE public.email_templates SET subject_template = 'Ticket {{ticket_no}} - {{subject}} is pending your approval' WHERE trigger_key = 'RESOLVED_ADMIN';
UPDATE public.email_templates SET subject_template = 'Your ticket {{ticket_no}} - {{subject}} has been closed' WHERE trigger_key = 'CLOSED_CUSTOMER';
UPDATE public.email_templates SET subject_template = 'Your resolution for ticket {{ticket_no}} - {{subject}} has been approved' WHERE trigger_key = 'APPROVED_ENGINEER';
UPDATE public.email_templates SET subject_template = 'Your resolution for ticket {{ticket_no}} - {{subject}} was rejected' WHERE trigger_key = 'RETURNED_ENGINEER';
