-- The "Support Group" checkbox was missing from the "New Ticket -> Customer"
-- template's available options (a gap from an earlier migration that never
-- got fully applied). Just expose it as an available option here - it stays
-- unchecked; recipient_roles (the actual selection) is untouched.

UPDATE public.email_templates SET
  available_recipients = '[{"key":"customer","label":"Bank Officer (Ticket Creator)"},{"key":"admin","label":"All Admins"},{"key":"support_group","label":"Support Group"}]'
WHERE trigger_key = 'NEW_TICKET_CUSTOMER';
