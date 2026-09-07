-- The previous migration (20260827100000) logged SLA due date overrides into
-- a "ticket_history" table that does not actually exist in this database.
-- Store the last override directly on the ticket instead.

ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS sla_due_date_override_reason text,
  ADD COLUMN IF NOT EXISTS sla_due_date_override_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sla_due_date_override_at timestamptz;

CREATE OR REPLACE FUNCTION public.log_sla_due_date_override(
  p_ticket_id uuid,
  p_new_due_date timestamptz,
  p_reason text
)
RETURNS void AS $$
DECLARE
  v_can_edit boolean;
BEGIN
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'A reason is required to change the SLA Due Date.';
  END IF;

  SELECT (auth.uid() = assigned_to OR public.is_admin(auth.uid()))
  INTO v_can_edit
  FROM public.tickets
  WHERE id = p_ticket_id;

  IF NOT COALESCE(v_can_edit, false) THEN
    RAISE EXCEPTION 'Only the assigned engineer or an administrator can change the SLA Due Date.';
  END IF;

  UPDATE public.tickets
  SET
    sla_due_date = p_new_due_date,
    sla_due_date_override_reason = p_reason,
    sla_due_date_override_by = auth.uid(),
    sla_due_date_override_at = now()
  WHERE id = p_ticket_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
