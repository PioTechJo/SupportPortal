-- New CEO-requested feature: the bank user who opened a ticket can escalate it
-- straight to management (CEO / Deputy / PS Director / Support Manager) without
-- affecting the ticket's normal support workflow, which keeps running in parallel.
-- Those recipients aren't system users (no accounts/roles yet), so they're a
-- plain configurable address list, same pattern as support_group_email.

ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS is_management_escalated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS management_escalation_note text,
  ADD COLUMN IF NOT EXISTS management_escalated_at timestamptz,
  ADD COLUMN IF NOT EXISTS management_escalated_by uuid REFERENCES public.users(id) ON DELETE SET NULL;

INSERT INTO public.system_settings (setting_key, setting_value)
VALUES ('management_escalation_recipients', '')
ON CONFLICT (setting_key) DO NOTHING;

-- SECURITY DEFINER so this works without loosening the tickets UPDATE RLS
-- policy (which is normally limited to the assignee/manager/admin) — only the
-- ticket's own creator may call this, checked explicitly below.
CREATE OR REPLACE FUNCTION public.escalate_ticket_to_management(
  p_ticket_id uuid,
  p_note text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_created_by uuid;
  v_already_escalated boolean;
BEGIN
  SELECT created_by, is_management_escalated INTO v_created_by, v_already_escalated
  FROM public.tickets
  WHERE id = p_ticket_id;

  IF v_created_by IS NULL THEN
    RAISE EXCEPTION 'Ticket not found.';
  END IF;

  IF auth.uid() != v_created_by THEN
    RAISE EXCEPTION 'Only the person who opened this ticket can escalate it to management.';
  END IF;

  IF v_already_escalated THEN
    RAISE EXCEPTION 'This ticket has already been escalated to management.';
  END IF;

  UPDATE public.tickets
  SET
    is_management_escalated = true,
    management_escalation_note = p_note,
    management_escalated_at = now(),
    management_escalated_by = auth.uid()
  WHERE id = p_ticket_id;
END;
$$;

INSERT INTO public.email_templates (trigger_key, trigger_label, available_variables, available_recipients, recipient_roles, subject_template, body_template) VALUES
('MANAGEMENT_ESCALATION', 'Escalated -> Management',
  '[{"key":"ticket_no","label":"Ticket Number"},{"key":"subject","label":"Ticket Subject"},{"key":"customer_name","label":"Bank / Customer Name"},{"key":"escalated_by_name","label":"Escalated By"},{"key":"escalation_note","label":"Escalation Note"}]',
  '[{"key":"management_escalation","label":"Management Escalation Recipients"},{"key":"support_group","label":"Support Group"},{"key":"admin","label":"All Admins"},{"key":"assignee","label":"Assignee"}]',
  '["management_escalation", "admin"]',
  'Management Escalation - Ticket {{ticket_no}}',
  E'Dears,\n\nTicket {{ticket_no}} ({{subject}}) from {{customer_name}} has been escalated directly to management by {{escalated_by_name}}.\n\nEscalation note:\n{{escalation_note}}\n\nPlease review and follow up as needed.\n\nBest Regards,\nPio-Tech Support Team'
)
ON CONFLICT (trigger_key) DO NOTHING;
