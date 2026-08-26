-- Make "Support Group" selectable as a recipient on every ticket-notification
-- template, not just Assign/Escalation. (It already resolves to the shared
-- support_group_email setting, so this just exposes the checkbox everywhere.)

UPDATE public.email_templates SET
  available_recipients = '[{"key":"admin","label":"All Admins"},{"key":"customer","label":"Bank Officer (Ticket Creator)"},{"key":"support_group","label":"Support Group"}]'
WHERE trigger_key = 'NEW_TICKET_ADMIN';

UPDATE public.email_templates SET
  available_recipients = '[{"key":"customer","label":"Bank Officer (Ticket Creator)"},{"key":"admin","label":"All Admins"},{"key":"support_group","label":"Support Group"}]'
WHERE trigger_key = 'NEW_TICKET_CUSTOMER';

UPDATE public.email_templates SET
  available_recipients = '[{"key":"admin","label":"All Admins"},{"key":"customer","label":"Bank Officer (Ticket Creator)"},{"key":"assignee","label":"Assignee (Engineer)"},{"key":"support_group","label":"Support Group"}]'
WHERE trigger_key = 'RESOLVED_ADMIN';

UPDATE public.email_templates SET
  available_recipients = '[{"key":"customer","label":"Bank Officer (Ticket Creator)"},{"key":"assignee","label":"Assignee (Engineer)"},{"key":"admin","label":"All Admins"},{"key":"support_group","label":"Support Group"}]'
WHERE trigger_key = 'CLOSED_CUSTOMER';

UPDATE public.email_templates SET
  available_recipients = '[{"key":"assignee","label":"Assignee (Engineer)"},{"key":"admin","label":"All Admins"},{"key":"support_group","label":"Support Group"}]'
WHERE trigger_key = 'APPROVED_ENGINEER';

UPDATE public.email_templates SET
  available_recipients = '[{"key":"assignee","label":"Assignee (Engineer)"},{"key":"admin","label":"All Admins"},{"key":"developer","label":"Escalated Developer"},{"key":"support_group","label":"Support Group"}]'
WHERE trigger_key = 'RETURNED_ENGINEER';

-- TICKET_ASSIGNED_ENGINEER and ESCALATION_DEVELOPER already have support_group.
