-- Replace the "New Ticket -> Admin" notification with the exact wording
-- requested, and add created_by_name / customer_name / product_name /
-- description as available template variables.

UPDATE public.email_templates
SET
  available_variables = '[
    {"key":"ticket_no","label":"Ticket Number"},
    {"key":"subject","label":"Ticket Subject"},
    {"key":"description","label":"Problem Description"},
    {"key":"created_by_email","label":"Created By (Email)"},
    {"key":"created_by_name","label":"Created By (Name)"},
    {"key":"customer_name","label":"Bank / Customer Name"},
    {"key":"product_name","label":"Product"}
  ]'::jsonb,
  subject_template = 'New ticket {{ticket_no}} has been created by {{created_by_email}} - {{subject}}',
  body_template = E'Dears,\n\nA Portal Ticket has been opened by {{created_by_name}} , {{customer_name}} as a {{product_name}} .\n\nKindly check the Ticket title {{subject}} , problem description is {{description}}, the ticket ID no. is {{ticket_no}} and edit the ticket severity, other details, in order to send a Ticket Submitted Email to the customer ASAP.\n\nBest Regards,'
WHERE trigger_key = 'NEW_TICKET_ADMIN';
