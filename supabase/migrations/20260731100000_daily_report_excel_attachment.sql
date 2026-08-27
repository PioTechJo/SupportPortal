-- The daily report now ships the pending-ticket list as an attached Excel
-- sheet instead of listing it in the email body.

UPDATE public.email_templates SET
  available_variables = '[{"key":"report_date","label":"Report Date"},{"key":"pending_count","label":"Pending Ticket Count"}]',
  subject_template = 'Daily Pending Tickets Report - {{report_date}}',
  body_template = E'Hello,\n\nThere are {{pending_count}} pending ticket(s) as of {{report_date}}.\n\nPlease see the attached spreadsheet for the full list.'
WHERE trigger_key = 'DAILY_REPORT';
