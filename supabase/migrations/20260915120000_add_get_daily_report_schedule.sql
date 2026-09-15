-- The Daily Report admin page always displayed a hardcoded default (08:00)
-- for "Send Time" instead of the actual cron schedule, so it could silently
-- disagree with the real, currently-active schedule. Expose the real value.

CREATE OR REPLACE FUNCTION public.get_daily_report_schedule()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_schedule text;
  v_minute int;
  v_hour_utc int;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT schedule INTO v_schedule FROM cron.job WHERE jobname = 'daily-ticket-report';

  IF v_schedule IS NULL THEN
    RETURN NULL;
  END IF;

  v_minute := split_part(v_schedule, ' ', 1)::int;
  v_hour_utc := split_part(v_schedule, ' ', 2)::int;

  RETURN jsonb_build_object('hour_utc', v_hour_utc, 'minute', v_minute);
END;
$$;
