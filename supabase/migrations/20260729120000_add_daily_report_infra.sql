-- Daily automated ticket report: a scheduled job (pg_cron) hits the "daily-report"
-- Edge Function every day, which pulls live stats via get_daily_report_stats(),
-- renders the DAILY_REPORT email template, and sends it to the configured
-- recipients via the existing Power Automate email pipeline.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 1. Ticket stats used by the report
CREATE OR REPLACE FUNCTION public.get_daily_report_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_today integer;
  v_resolved_today integer;
  v_open_total integer;
  v_overdue_sla integer;
BEGIN
  SELECT count(*) INTO v_new_today
  FROM public.tickets
  WHERE created_at >= date_trunc('day', now());

  SELECT count(*) INTO v_resolved_today
  FROM public.tickets t
  JOIN public.ticket_statuses s ON s.id = t.status_id
  WHERE s.status_code IN ('RESOLVED', 'CLOSED', 'APPROVED')
    AND t.updated_at >= date_trunc('day', now());

  SELECT count(*) INTO v_open_total
  FROM public.tickets t
  JOIN public.ticket_statuses s ON s.id = t.status_id
  WHERE s.status_code NOT IN ('CLOSED', 'APPROVED');

  SELECT count(*) INTO v_overdue_sla
  FROM public.tickets t
  JOIN public.ticket_statuses s ON s.id = t.status_id
  WHERE s.status_code NOT IN ('CLOSED', 'APPROVED')
    AND t.sla_due_date < now();

  RETURN jsonb_build_object(
    'new_today', v_new_today,
    'resolved_today', v_resolved_today,
    'open_total', v_open_total,
    'overdue_sla', v_overdue_sla
  );
END;
$$;

-- 2. Editable email template for the report (same system as the other 8 notifications)
INSERT INTO public.email_templates (trigger_key, trigger_label, available_variables, subject_template, body_template) VALUES
('DAILY_REPORT', 'Daily Report -> Recipients',
  '[{"key":"report_date","label":"Report Date"},{"key":"new_today","label":"New Tickets Today"},{"key":"resolved_today","label":"Resolved/Closed Today"},{"key":"open_total","label":"Currently Open"},{"key":"overdue_sla","label":"Overdue SLA"}]',
  'Daily Ticket Report - {{report_date}}',
  E'Hello,\n\nHere is the daily ticket summary for {{report_date}}:\n\nNew tickets today: {{new_today}}\nResolved/Closed today: {{resolved_today}}\nCurrently open: {{open_total}}\nOverdue SLA: {{overdue_sla}}\n\nView the full list in the Support Portal.'
)
ON CONFLICT (trigger_key) DO NOTHING;

-- 3. Recipients list (comma-separated emails), editable from a new admin page
INSERT INTO public.system_settings (setting_key, setting_value)
VALUES ('daily_report_recipients', '')
ON CONFLICT (setting_key) DO NOTHING;

-- 4. Self-service reschedule, callable by admins from the app (no code change needed
-- to change the send time later)
CREATE OR REPLACE FUNCTION public.set_daily_report_schedule(p_hour_utc int, p_minute_utc int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'daily-ticket-report';

  PERFORM cron.schedule(
    'daily-ticket-report',
    format('%s %s * * *', p_minute_utc, p_hour_utc),
    $c$select net.http_post(
      url:='https://ybacrvdkbgljdykdogpz.supabase.co/functions/v1/daily-report',
      headers:='{"Content-Type":"application/json"}'::jsonb,
      body:='{}'::jsonb
    );$c$
  );
END;
$$;

-- 5. Initial schedule: 08:00 Amman time (UTC+3) = 05:00 UTC
SELECT cron.schedule(
  'daily-ticket-report',
  '0 5 * * *',
  $c$select net.http_post(
    url:='https://ybacrvdkbgljdykdogpz.supabase.co/functions/v1/daily-report',
    headers:='{"Content-Type":"application/json"}'::jsonb,
    body:='{}'::jsonb
  );$c$
);
