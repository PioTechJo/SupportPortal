-- Configurable email templates per notification trigger point, editable by admins
-- from a new admin page. Each template supports {{variable}} placeholders that get
-- filled in with real ticket data at send time.

CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_key text UNIQUE NOT NULL,
  trigger_label text NOT NULL,
  available_variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  subject_template text NOT NULL,
  body_template text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read email_templates" ON public.email_templates;
CREATE POLICY "Admins can read email_templates" ON public.email_templates
FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update email_templates" ON public.email_templates;
CREATE POLICY "Admins can update email_templates" ON public.email_templates
FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

INSERT INTO public.email_templates (trigger_key, trigger_label, available_variables, subject_template, body_template) VALUES
('NEW_TICKET_ADMIN', 'New Ticket -> Admin',
  '[{"key":"ticket_no","label":"Ticket Number"},{"key":"subject","label":"Ticket Subject"},{"key":"created_by_email","label":"Created By (Email)"}]',
  'New ticket {{ticket_no}} has been created by {{created_by_email}} - {{subject}}',
  E'Hello Admin,\n\nA new ticket has been created:\n\nTicket No: {{ticket_no}}\nSubject: {{subject}}\nCreated By: {{created_by_email}}\n\nPlease review the ticket in the admin portal.'
),
('NEW_TICKET_CUSTOMER', 'New Ticket -> Customer',
  '[{"key":"ticket_no","label":"Ticket Number"},{"key":"subject","label":"Ticket Subject"}]',
  'Your ticket {{ticket_no}} has been created',
  E'Hello,\n\nYour ticket {{ticket_no}} has been created and is being reviewed.\n\nSubject: {{subject}}\n\nWe will get back to you shortly.'
),
('TICKET_ASSIGNED_ENGINEER', 'Assigned -> Engineer',
  '[{"key":"ticket_no","label":"Ticket Number"},{"key":"subject","label":"Ticket Subject"},{"key":"engineer_name","label":"Engineer Name"}]',
  'You have been assigned to ticket {{ticket_no}}: {{subject}}',
  E'Hello {{engineer_name}},\n\nYou have been assigned to ticket {{ticket_no}}.\n\nSubject: {{subject}}\n\nPlease review it in the Support Portal.'
),
('ESCALATION_DEVELOPER', 'Escalation -> Developer',
  '[{"key":"ticket_no","label":"Ticket Number"},{"key":"subject","label":"Ticket Subject"},{"key":"escalation_note","label":"Escalation Note"}]',
  'You have been assigned an escalation for ticket {{ticket_no}}: {{subject}}',
  E'You have been assigned an escalation for ticket {{ticket_no}}: {{subject}}.\n\nEscalation note: {{escalation_note}}'
),
('RESOLVED_ADMIN', 'Resolved (Pending Approval) -> Admin',
  '[{"key":"ticket_no","label":"Ticket Number"},{"key":"subject","label":"Ticket Subject"},{"key":"resolved_by_name","label":"Resolved By"}]',
  'Ticket {{ticket_no}} is pending your approval',
  E'Ticket {{ticket_no}} has been resolved by {{resolved_by_name}} and is pending your approval.\n\nSubject: {{subject}}'
),
('CLOSED_CUSTOMER', 'Closed -> Customer',
  '[{"key":"ticket_no","label":"Ticket Number"},{"key":"subject","label":"Ticket Subject"}]',
  'Your ticket {{ticket_no}} has been closed',
  E'Your ticket {{ticket_no}} has been resolved and closed by our support team. Please review and approve the resolution at your convenience.\n\nSubject: {{subject}}'
),
('APPROVED_ENGINEER', 'Approved -> Engineer',
  '[{"key":"ticket_no","label":"Ticket Number"},{"key":"subject","label":"Ticket Subject"}]',
  'Your resolution for ticket {{ticket_no}} has been approved',
  E'Your resolution for ticket {{ticket_no}} has been approved.\n\nSubject: {{subject}}'
),
('RETURNED_ENGINEER', 'Returned (Rejected) -> Engineer',
  '[{"key":"ticket_no","label":"Ticket Number"},{"key":"subject","label":"Ticket Subject"}]',
  'Your resolution for ticket {{ticket_no}} was rejected',
  E'Your resolution for ticket {{ticket_no}} was rejected and requires further investigation.\n\nSubject: {{subject}}'
)
ON CONFLICT (trigger_key) DO NOTHING;
