-- The day the ticket is created counts as day 1 of its SLA (when it is a
-- working day). Friday and Saturday still never count.
--
-- Example: created Thu 26 Nov, Low = 5 days -> Thu(1) Sun(2) Mon(3) Tue(4)
-- Wed(5) = Wed 2 Dec. A ticket created on a Friday/Saturday starts counting
-- from Sunday, because the creation day is not a working day.

CREATE OR REPLACE FUNCTION public.add_business_days(p_start timestamptz, p_days integer)
RETURNS timestamptz
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_local timestamp := p_start AT TIME ZONE 'Asia/Amman';
  v_remaining integer := GREATEST(COALESCE(p_days, 0), 0);
BEGIN
  -- DOW: Sunday = 0 ... Friday = 5, Saturday = 6
  IF v_remaining > 0 AND EXTRACT(DOW FROM v_local) NOT IN (5, 6) THEN
    v_remaining := v_remaining - 1; -- the creation day counts
  END IF;

  WHILE v_remaining > 0 LOOP
    v_local := v_local + interval '1 day';
    IF EXTRACT(DOW FROM v_local) NOT IN (5, 6) THEN
      v_remaining := v_remaining - 1;
    END IF;
  END LOOP;

  RETURN v_local AT TIME ZONE 'Asia/Amman';
END;
$$;
