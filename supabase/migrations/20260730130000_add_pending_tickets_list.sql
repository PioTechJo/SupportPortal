-- Powers the daily report's new "pending tickets" list (replacing the plain
-- counts) — every ticket still open, with its age in days.

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
      'days_open', EXTRACT(DAY FROM now() - t.created_at)::int
    ) AS row_data
    FROM public.tickets t
    JOIN public.ticket_statuses s ON s.id = t.status_id
    WHERE s.status_code NOT IN ('CLOSED', 'APPROVED')
  ) sub;

  RETURN v_result;
END;
$$;
