-- Replace the "New Ticket -> Customer" (bank) notification with the exact
-- wording requested, and add "description" (problem description) as an
-- available template variable.

UPDATE public.email_templates
SET
  available_variables = '[
    {"key":"ticket_no","label":"Ticket Number"},
    {"key":"subject","label":"Ticket Subject"},
    {"key":"description","label":"Problem Description"},
    {"key":"start_date","label":"Expected Start Date"},
    {"key":"end_date","label":"Expected End Date"},
    {"key":"priority","label":"Priority"}
  ]'::jsonb,
  subject_template = 'Your ticket {{ticket_no}} has been created',
  body_template = E'Dears,\n\nWe received your request ticket number {{ticket_no}}.\n\nIt is forwarded to the department in charge who will contact you soon to handle your request.\nPlease refer to the above ticket number for any future communication in relation to this issue.\n\nTickets Details:\n\nThe Ticket title is {{subject}} , And problem description is {{description}} .\n\n- Priority : {{priority}}\n- Expected Start Date : {{start_date}}\n- Expected End Date : {{end_date}}\n\nBest regards,\n\nPio-Tech Support Team'
WHERE trigger_key = 'NEW_TICKET_CUSTOMER';
