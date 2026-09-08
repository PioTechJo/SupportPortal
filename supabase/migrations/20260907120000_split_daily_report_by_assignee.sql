-- The daily pending-tickets report now splits into two separate emails:
--   1. Every pending ticket, regardless of who it's assigned to -> a fixed
--      recipient (configurable via the new daily_report_all_recipients setting).
--   2. Only pending tickets assigned to a Support team member (Support
--      Engineer / Support Manager) -> the shared Support Group mailbox.
-- get_pending_tickets_list() now also returns each ticket's assignee role
-- code so the Edge Function can split the list itself.

CREATE OR REPLACE FUNCTION public.get_pending_tickets_list()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(row_data ORDER BY row_data->>'days_open' DESC), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'ticket_no', t.ticket_no,
      'subject', t.subject,
      'status_name', s.status_name,
      'days_open', EXTRACT(DAY FROM now() - t.created_at)::int,
      'is_support_assignee', COALESCE(UPPER(r.role_code) IN ('SUPPORT_ENGINEER', 'SUPPORT_MANAGER'), false)
    ) AS row_data
    FROM public.tickets t
    JOIN public.ticket_statuses s ON s.id = t.status_id
    LEFT JOIN public.users u ON u.id = t.assigned_to
    LEFT JOIN public.roles r ON r.id = u.role_id
    WHERE s.status_code NOT IN ('CLOSED', 'APPROVED')
  ) sub;

  RETURN v_result;
END;
$$;

INSERT INTO public.system_settings (setting_key, setting_value)
VALUES ('daily_report_all_recipients', 'leen.aloraidi@pio-tech.com')
ON CONFLICT (setting_key) DO NOTHING;
