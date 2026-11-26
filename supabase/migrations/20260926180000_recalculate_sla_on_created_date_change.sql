-- The SLA Due Date is counted from the ticket's created date, so it must be
-- recomputed whenever the created date is adjusted too (not only when the
-- priority changes). Same rules as before: working days only (Fri/Sat
-- excluded, creation day counts), Development tickets are skipped, a missing
-- SLA setting leaves the date untouched, and a manual override no longer
-- applies once the inputs change.

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
     OR (NEW.priority_id IS NOT DISTINCT FROM OLD.priority_id
         AND NEW.created_at IS NOT DISTINCT FROM OLD.created_at)
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

  NEW.sla_due_date := public.add_business_days(NEW.created_at, v_days);
  NEW.sla_due_date_override_reason := NULL;
  NEW.sla_due_date_override_by := NULL;
  NEW.sla_due_date_override_at := NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalculate_sla_on_priority_change ON public.tickets;
CREATE TRIGGER trg_recalculate_sla_on_priority_change
BEFORE UPDATE OF priority_id, created_at ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_sla_on_priority_change();
