-- Allow the assignee/admin to manually change the SLA Due Date (with a
-- mandatory reason), while permanently preserving the original computed
-- date for reference.

ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS original_sla_due_date timestamptz;

-- Backfill: for existing tickets, the original date is whatever is
-- currently stored (nothing has overridden it yet).
UPDATE public.tickets
SET original_sla_due_date = sla_due_date
WHERE original_sla_due_date IS NULL;

-- Going forward, capture the original the moment a ticket is created and
-- never let it be overwritten again.
CREATE OR REPLACE FUNCTION public.set_original_sla_due_date()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.original_sla_due_date := NEW.sla_due_date;
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.original_sla_due_date := OLD.original_sla_due_date;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_set_original_sla_due_date ON public.tickets;
CREATE TRIGGER trg_set_original_sla_due_date
BEFORE INSERT OR UPDATE ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.set_original_sla_due_date();

-- Log manual SLA due date overrides into the existing ticket_history table
-- so the reason is kept alongside the rest of the ticket's audit trail.
CREATE OR REPLACE FUNCTION public.log_sla_due_date_override(
  p_ticket_id uuid,
  p_new_due_date timestamptz,
  p_reason text
)
RETURNS void AS $$
DECLARE
  v_can_edit boolean;
  v_old_due_date timestamptz;
BEGIN
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'A reason is required to change the SLA Due Date.';
  END IF;

  SELECT (auth.uid() = assigned_to OR public.is_admin(auth.uid())), sla_due_date
  INTO v_can_edit, v_old_due_date
  FROM public.tickets
  WHERE id = p_ticket_id;

  IF NOT COALESCE(v_can_edit, false) THEN
    RAISE EXCEPTION 'Only the assigned engineer or an administrator can change the SLA Due Date.';
  END IF;

  UPDATE public.tickets
  SET sla_due_date = p_new_due_date
  WHERE id = p_ticket_id;

  INSERT INTO public.ticket_history (ticket_id, event_type, actor_id, note)
  VALUES (
    p_ticket_id,
    'sla_due_date_changed',
    auth.uid(),
    format('Changed from %s to %s. Reason: %s', v_old_due_date, p_new_due_date, p_reason)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
