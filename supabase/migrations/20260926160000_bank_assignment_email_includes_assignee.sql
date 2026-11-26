-- The bank email sent at assignment goes To: the bank users selected at ticket
-- creation AND the assignee (CC support@ stays). It must never include the
-- admin who created the ticket on the bank's behalf.

UPDATE public.email_templates
SET recipient_roles = '["customer", "assignee"]'::jsonb,
    available_recipients = '[
      {"key": "customer", "label": "Bank users (creator and selected)"},
      {"key": "assignee", "label": "Assignee (Engineer)"},
      {"key": "support_email", "label": "Support (support@)"},
      {"key": "support_team_email", "label": "Support Team (support.team@)"},
      {"key": "support_group", "label": "Support Group (both mailboxes)"},
      {"key": "admin", "label": "All Admins"}
    ]'::jsonb
WHERE trigger_key = 'NEW_TICKET_CUSTOMER';
