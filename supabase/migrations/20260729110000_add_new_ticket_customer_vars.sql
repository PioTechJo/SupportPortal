-- Add start_date / end_date (SLA due) / priority as available variables for the
-- "New Ticket -> Customer" email template, matching the values now passed from
-- TicketCreationWizard.tsx.

UPDATE public.email_templates
SET available_variables = '[
  {"key":"ticket_no","label":"Ticket Number"},
  {"key":"subject","label":"Ticket Subject"},
  {"key":"start_date","label":"Start Date"},
  {"key":"end_date","label":"End Date (SLA Due)"},
  {"key":"priority","label":"Priority"}
]'::jsonb
WHERE trigger_key = 'NEW_TICKET_CUSTOMER';
