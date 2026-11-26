-- The bank email no longer says "Your ticket has been assigned to ... and is
-- now being worked on."; the email itself already goes out at assignment.

UPDATE public.email_templates
SET body_template = replace(
      body_template,
      E'\n\nYour ticket has been assigned to {{assignee_name}} from our support team and is now being worked on.',
      ''
    )
WHERE trigger_key = 'NEW_TICKET_CUSTOMER';
