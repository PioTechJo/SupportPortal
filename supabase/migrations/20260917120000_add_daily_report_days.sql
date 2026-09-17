-- Adds day-of-week selection to the daily report schedule, so admins can skip
-- days (e.g. Friday) without touching the daily-report Edge Function itself.
-- p_days / returned "days" use standard cron day-of-week numbers: 0=Sun..6=Sat.

CREATE OR REPLACE FUNCTION public.get_daily_report_schedule()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_schedule text;
  v_minute int;
  v_hour_utc int;
  v_days text;
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
  v_days := split_part(v_schedule, ' ', 5);

  RETURN jsonb_build_object('hour_utc', v_hour_utc, 'minute', v_minute, 'days', v_days);
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_daily_report_schedule(p_hour_utc integer, p_minute_utc integer, p_days text DEFAULT '*')
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'daily-ticket-report';

  PERFORM cron.schedule(
    'daily-ticket-report',
    format('%s %s * * %s', p_minute_utc, p_hour_utc, p_days),
    $c$select net.http_post(
      url:='https://ybacrvdkbgljdykdogpz.supabase.co/functions/v1/daily-report',
      headers:='{"Content-Type":"application/json"}'::jsonb,
      body:='{}'::jsonb
    );$c$
  );
END;
$function$;
