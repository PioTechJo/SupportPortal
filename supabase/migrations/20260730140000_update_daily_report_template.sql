-- Switch the daily report from plain counts to a detailed pending-ticket list,
-- and default it to the Support Group mailbox.

UPDATE public.email_templates SET
  available_variables = '[{"key":"report_date","label":"Report Date"},{"key":"pending_count","label":"Pending Ticket Count"},{"key":"pending_tickets_list","label":"Pending Tickets List"}]',
  subject_template = 'Daily Pending Tickets Report - {{report_date}}',
  body_template = E'Hello,\n\nHere are the {{pending_count}} pending ticket(s) as of {{report_date}}:\n\n{{pending_tickets_list}}\n\nView the full list in the Support Portal.'
WHERE trigger_key = 'DAILY_REPORT';
