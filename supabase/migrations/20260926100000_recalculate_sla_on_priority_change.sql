-- When a ticket's priority changes, recompute its SLA Due Date from the
-- SLA Configuration (system_settings sla_days_<priority>), counted from the
-- ticket's creation date — the same rule used when a ticket is created.
-- Doing it in the database covers every code path that changes priority.
--
-- Notes:
--   * Development tickets have no priority/SLA-by-priority, so they are skipped.
--   * If the SLA Configuration has no value for the new priority, the due
--     date is left untouched.
--   * original_sla_due_date is preserved by trg_set_original_sla_due_date.
--   * A manual override no longer applies once the priority changes, so its
--     reason/author/timestamp are cleared.

CREATE OR REPLACE FUNCTION public.recalculate_sla_on_priority_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_priority_name text;
  v_days_text text;
  v_days integer;
BEGIN
  IF NEW.priority_id IS NULL
     OR NEW.priority_id IS NOT DISTINCT FROM OLD.priority_id
     OR COALESCE(NEW.ticket_type, 'SUPPORT') = 'DEVELOPMENT'
     OR NEW.created_at IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT priority_name INTO v_priority_name
  FROM public.priorities
  WHERE id = NEW.priority_id;

  IF v_priority_name IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT setting_value INTO v_days_text
  FROM public.system_settings
  WHERE setting_key = 'sla_days_' || lower(v_priority_name);

  IF v_days_text IS NULL OR v_days_text !~ '^\s*\d+\s*$' THEN
    RETURN NEW;
  END IF;

  v_days := btrim(v_days_text)::integer;

  NEW.sla_due_date := NEW.created_at + make_interval(days => v_days);
  NEW.sla_due_date_override_reason := NULL;
  NEW.sla_due_date_override_by := NULL;
  NEW.sla_due_date_override_at := NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalculate_sla_on_priority_change ON public.tickets;
CREATE TRIGGER trg_recalculate_sla_on_priority_change
BEFORE UPDATE OF priority_id ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_sla_on_priority_change();
