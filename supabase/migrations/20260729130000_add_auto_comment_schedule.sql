-- Auto-comment nudge: if a ticket sits with no support update for 24h, the
-- "daily-ticket-update" Edge Function posts a system comment + notifies the
-- customer. Runs hourly via pg_cron so the 24h threshold is caught promptly.
-- Admin-toggleable via the 'auto_comment_enabled' system_settings row (checked
-- inside the function itself, so pausing it doesn't require touching the cron job).

INSERT INTO public.system_settings (setting_key, setting_value)
VALUES ('auto_comment_enabled', 'true')
ON CONFLICT (setting_key) DO NOTHING;

SELECT cron.schedule(
  'auto-comment-tickets',
  '0 * * * *',
  $c$select net.http_post(
    url:='https://ybacrvdkbgljdykdogpz.supabase.co/functions/v1/daily-ticket-update',
    headers:='{"Content-Type":"application/json"}'::jsonb,
    body:='{}'::jsonb
  );$c$
);
