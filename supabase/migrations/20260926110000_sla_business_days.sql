-- SLA days are working days: Friday and Saturday (the weekend) are not
-- counted. Counting starts the day after the ticket is created and keeps the
-- time of day; weekdays are evaluated in Jordan time (Asia/Amman).
--
-- Example: created Thu 26 Nov 2:00 PM, 5 days -> Sun(1) Mon(2) Tue(3) Wed(4)
-- Thu(5) = Thu 3 Dec 2:00 PM.

CREATE OR REPLACE FUNCTION public.add_business_days(p_start timestamptz, p_days integer)
RETURNS timestamptz
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_local timestamp := p_start AT TIME ZONE 'Asia/Amman';
  v_remaining integer := GREATEST(COALESCE(p_days, 0), 0);
BEGIN
  WHILE v_remaining > 0 LOOP
    v_local := v_local + interval '1 day';
    -- DOW: Sunday = 0 ... Friday = 5, Saturday = 6
    IF EXTRACT(DOW FROM v_local) NOT IN (5, 6) THEN
      v_remaining := v_remaining - 1;
    END IF;
  END LOOP;
  RETURN v_local AT TIME ZONE 'Asia/Amman';
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_business_days(timestamptz, integer) TO authenticated;

-- Use it when the priority changes (replaces the calendar-day calculation
-- from 20260926100000).
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

  NEW.sla_due_date := public.add_business_days(NEW.created_at, v_days);
  NEW.sla_due_date_override_reason := NULL;
  NEW.sla_due_date_override_by := NULL;
  NEW.sla_due_date_override_at := NULL;

  RETURN NEW;
END;
$$;
