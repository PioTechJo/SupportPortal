-- Daily report follow-up:
--  1. get_pending_tickets_list() now returns the full ticket detail needed to
--     match the requested spreadsheet layout (Ticket ID, Current Status,
--     Status, Opened Date, Due Date, Assigned To, Severity, Tiket #, Synopsis,
--     Closed, Problem Description, Solution, Account Name).
--  2. The "support" half of the report now goes to its own dedicated address
--     (daily_report_support_recipients) instead of the general-purpose
--     support_group_email used elsewhere in the app.

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
      'ticket_id', split_part(t.ticket_no, ' - ', 1),
      'ticket_no', t.ticket_no,
      'subject', t.subject,
      'status_name', s.status_name,
      'days_open', EXTRACT(DAY FROM now() - t.created_at)::int,
      'is_support_assignee', COALESCE(UPPER(r.role_code) IN ('SUPPORT_ENGINEER', 'SUPPORT_MANAGER'), false),
      'assigned_to_name', au.full_name,
      'severity', p.priority_name,
      'opened_date', t.created_at,
      'due_date', t.sla_due_date,
      'closed_date', t.closed_at,
      'description', t.description,
      'solution', t.resolution_justification,
      'account_name', c.customer_name
    ) AS row_data
    FROM public.tickets t
    JOIN public.ticket_statuses s ON s.id = t.status_id
    LEFT JOIN public.users au ON au.id = t.assigned_to
    LEFT JOIN public.roles r ON r.id = au.role_id
    LEFT JOIN public.priorities p ON p.id = t.priority_id
    LEFT JOIN public.customers c ON c.id = t.customer_id
    WHERE s.status_code NOT IN ('CLOSED', 'APPROVED')
  ) sub;

  RETURN v_result;
END;
$$;

INSERT INTO public.system_settings (setting_key, setting_value)
VALUES ('daily_report_support_recipients', 'support@pio-tech.com')
ON CONFLICT (setting_key) DO NOTHING;
