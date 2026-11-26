-- Notification routing with To / CC.
--
--  * New ticket        -> ONE email To: support@ and support.team@ (nobody else).
--  * Ticket assigned   -> email #1 To: the bank users chosen at ticket
--                         creation (it names the assignee), CC: support@
--                         email #2 To: the assignee, CC: support.team@

ALTER TABLE public.email_templates
  ADD COLUMN IF NOT EXISTS cc_roles jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Individual support mailboxes (the existing support_group_email setting
-- keeps meaning "both of them").
INSERT INTO public.system_settings (setting_key, setting_value)
SELECT 'support_email', 'support@pio-tech.com'
WHERE NOT EXISTS (SELECT 1 FROM public.system_settings WHERE setting_key = 'support_email');

INSERT INTO public.system_settings (setting_key, setting_value)
SELECT 'support_team_email', 'support.team@pio-tech.com'
WHERE NOT EXISTS (SELECT 1 FROM public.system_settings WHERE setting_key = 'support_team_email');

-- New ticket (internal notification): only the two support mailboxes.
UPDATE public.email_templates
SET recipient_roles = '["support_email", "support_team_email"]'::jsonb,
    cc_roles = '[]'::jsonb,
    available_recipients = '[
      {"key": "support_email", "label": "Support (support@)"},
      {"key": "support_team_email", "label": "Support Team (support.team@)"},
      {"key": "support_group", "label": "Support Group (both mailboxes)"},
      {"key": "admin", "label": "All Admins"},
      {"key": "customer", "label": "Bank users (creator and selected)"}
    ]'::jsonb
WHERE trigger_key = 'NEW_TICKET_ADMIN';

-- Email to the bank at assignment: To = users selected at ticket creation,
-- CC = support@. Mentions who the ticket is assigned to.
UPDATE public.email_templates
SET recipient_roles = '["customer"]'::jsonb,
    cc_roles = '["support_email"]'::jsonb,
    available_recipients = '[
      {"key": "customer", "label": "Bank users (creator and selected)"},
      {"key": "support_email", "label": "Support (support@)"},
      {"key": "support_team_email", "label": "Support Team (support.team@)"},
      {"key": "support_group", "label": "Support Group (both mailboxes)"},
      {"key": "admin", "label": "All Admins"}
    ]'::jsonb,
    body_template = replace(
      body_template,
      'Your ticket has been assigned to our support team and is now being worked on.',
      'Your ticket has been assigned to {{assignee_name}} from our support team and is now being worked on.'
    ),
    available_variables = CASE
      WHEN available_variables @> '[{"key": "assignee_name"}]'::jsonb THEN available_variables
      ELSE available_variables || '[{"key": "assignee_name", "label": "Assignee Name"}]'::jsonb
    END
WHERE trigger_key = 'NEW_TICKET_CUSTOMER';

-- Email to the assignee: To = assignee, CC = support.team@.
UPDATE public.email_templates
SET recipient_roles = '["assignee"]'::jsonb,
    cc_roles = '["support_team_email"]'::jsonb,
    available_recipients = '[
      {"key": "assignee", "label": "Assignee (Engineer)"},
      {"key": "support_email", "label": "Support (support@)"},
      {"key": "support_team_email", "label": "Support Team (support.team@)"},
      {"key": "support_group", "label": "Support Group (both mailboxes)"},
      {"key": "customer", "label": "Bank users (creator and selected)"},
      {"key": "admin", "label": "All Admins"}
    ]'::jsonb
WHERE trigger_key = 'TICKET_ASSIGNED_ENGINEER';
