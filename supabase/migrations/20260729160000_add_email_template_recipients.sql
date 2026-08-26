-- Lets admins choose WHO a notification goes to (not just the wording), per
-- trigger point. available_recipients lists the roles that make sense for that
-- specific trigger (shown as checkboxes in the Email Templates admin page);
-- recipient_roles is the admin's current selection, read by getEmailDispatch()
-- at send time and resolved to real email addresses.

ALTER TABLE public.email_templates
ADD COLUMN IF NOT EXISTS available_recipients jsonb NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS recipient_roles jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.email_templates SET
  available_recipients = '[{"key":"admin","label":"All Admins"},{"key":"customer","label":"Bank Officer (Ticket Creator)"}]',
  recipient_roles = '["admin"]'
WHERE trigger_key = 'NEW_TICKET_ADMIN';

UPDATE public.email_templates SET
  available_recipients = '[{"key":"customer","label":"Bank Officer (Ticket Creator)"},{"key":"admin","label":"All Admins"}]',
  recipient_roles = '["customer"]'
WHERE trigger_key = 'NEW_TICKET_CUSTOMER';

UPDATE public.email_templates SET
  available_recipients = '[{"key":"assignee","label":"Assignee (Engineer)"},{"key":"customer","label":"Bank Officer (Ticket Creator)"},{"key":"support_group","label":"Support Group"},{"key":"admin","label":"All Admins"}]',
  recipient_roles = '["assignee"]'
WHERE trigger_key = 'TICKET_ASSIGNED_ENGINEER';

UPDATE public.email_templates SET
  available_recipients = '[{"key":"developer","label":"Escalated Developer"},{"key":"customer","label":"Bank Officer (Ticket Creator)"},{"key":"support_group","label":"Support Group"},{"key":"admin","label":"All Admins"}]',
  recipient_roles = '["developer"]'
WHERE trigger_key = 'ESCALATION_DEVELOPER';

UPDATE public.email_templates SET
  available_recipients = '[{"key":"admin","label":"All Admins"},{"key":"customer","label":"Bank Officer (Ticket Creator)"},{"key":"assignee","label":"Assignee (Engineer)"}]',
  recipient_roles = '["admin"]'
WHERE trigger_key = 'RESOLVED_ADMIN';

UPDATE public.email_templates SET
  available_recipients = '[{"key":"customer","label":"Bank Officer (Ticket Creator)"},{"key":"assignee","label":"Assignee (Engineer)"},{"key":"admin","label":"All Admins"}]',
  recipient_roles = '["customer"]'
WHERE trigger_key = 'CLOSED_CUSTOMER';

UPDATE public.email_templates SET
  available_recipients = '[{"key":"assignee","label":"Assignee (Engineer)"},{"key":"admin","label":"All Admins"}]',
  recipient_roles = '["assignee"]'
WHERE trigger_key = 'APPROVED_ENGINEER';

UPDATE public.email_templates SET
  available_recipients = '[{"key":"assignee","label":"Assignee (Engineer)"},{"key":"admin","label":"All Admins"},{"key":"developer","label":"Escalated Developer"}]',
  recipient_roles = '["assignee"]'
WHERE trigger_key = 'RETURNED_ENGINEER';
