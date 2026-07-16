-- Migration: Include customer_id in the Tickets by Bank breakdown so the
-- Overview page can link to a precise, server-side filtered ticket list
-- instead of relying on client-side name matching (which only filtered the
-- current 50-row page and produced wrong/partial results).

CREATE OR REPLACE FUNCTION public.get_dashboard_analytics(
    p_from_date date,
    p_to_date date,
    p_customer_ids uuid[] DEFAULT NULL,
    p_engineer_ids uuid[] DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_role_code text;
  v_customer_id uuid;
  v_is_internal boolean := false;
BEGIN
  v_user_id := auth.uid();

  SELECT r.role_code, u.customer_id
  INTO v_role_code, v_customer_id
  FROM public.users u
  JOIN public.roles r ON r.id = u.role_id
  WHERE u.id = v_user_id;

  v_is_internal := v_role_code IS NOT NULL AND v_role_code ILIKE ANY(
    ARRAY['ADMIN','ADMINISTRATOR','SYS_ADMIN','CEO','SUPPORT_MANAGER','SUPPORT_ENGINEER','TEAM_LEAD','TEAM_MEMBER','AGENT']
  );

  RETURN (
    WITH filtered_tickets AS (
      SELECT
        t.id,
        t.created_at,
        t.updated_at,
        t.assigned_user_id,
        t.legacy_assigned_to,
        t.customer_id,
        t.product_id,
        t.closed_at,
        t.approved_at,
        ts.status_code,
        c.customer_name,
        p.product_name,
        u.full_name AS assigned_to_name
      FROM public.tickets t
      LEFT JOIN public.ticket_statuses ts ON t.status_id = ts.id
      LEFT JOIN public.customers c ON t.customer_id = c.id
      LEFT JOIN public.products p ON t.product_id = p.id
      LEFT JOIN public.users u ON t.assigned_user_id = u.id
      WHERE t.created_at::date >= p_from_date
        AND t.created_at::date <= p_to_date
        AND (v_is_internal OR t.customer_id = v_customer_id)
        AND (p_customer_ids IS NULL OR t.customer_id = ANY(p_customer_ids))
        AND (p_engineer_ids IS NULL OR t.assigned_user_id = ANY(p_engineer_ids))
    ),
    metrics AS (
      SELECT
        count(*) FILTER (WHERE status_code = 'NEW') AS new_tickets,
        count(*) FILTER (WHERE status_code = 'REOPENED') AS reopened_tickets,
        count(*) FILTER (WHERE status_code = 'INVESTIGATION') AS in_progress_tickets,
        count(*) FILTER (WHERE status_code IN ('CLOSED', 'APPROVED')) AS closed_tickets
      FROM filtered_tickets
    ),
    tickets_by_bank_all AS (
      SELECT
        customer_id AS id,
        COALESCE(customer_name, 'Global Core') AS name,
        count(*) AS count
      FROM filtered_tickets
      GROUP BY customer_id, COALESCE(customer_name, 'Global Core')
      ORDER BY count DESC
    ),
    tickets_by_product AS (
      SELECT COALESCE(product_name, 'Legacy / Unspecified') AS name, count(*) AS value
      FROM filtered_tickets
      GROUP BY COALESCE(product_name, 'Legacy / Unspecified')
    ),
    engineer_performance AS (
      SELECT
        COALESCE(assigned_user_id::text, 'legacy:' || legacy_assigned_to, 'unassigned') AS id,
        COALESCE(assigned_to_name, legacy_assigned_to, 'Unassigned') AS name,
        count(*) AS assigned,
        count(*) FILTER (WHERE status_code IN ('RESOLVED', 'CLOSED', 'APPROVED')) AS resolved,
        COALESCE(
          sum(EXTRACT(EPOCH FROM (COALESCE(closed_at, approved_at, updated_at) - created_at)) / 3600.0)
          FILTER (WHERE status_code IN ('RESOLVED', 'CLOSED', 'APPROVED')),
          0
        ) AS total_hours
      FROM filtered_tickets
      GROUP BY assigned_user_id, assigned_to_name, legacy_assigned_to
    ),
    escalations AS (
      SELECT
        e.id, e.ticket_id, e.created_at, e.escalated_team_id,
        e.escalated_developer_name, e.escalation_returned_at,
        t.ticket_no, t.subject,
        tm.team_name,
        u2.full_name AS assigned_to_name,
        t.customer_id
      FROM public.ticket_comments e
      JOIN public.tickets t ON e.ticket_id = t.id
      LEFT JOIN public.teams tm ON e.escalated_team_id = tm.id
      LEFT JOIN public.users u2 ON t.assigned_user_id = u2.id
      WHERE e.is_internal = true
        AND e.escalated_team_id IS NOT NULL
        AND t.created_at::date >= p_from_date
        AND t.created_at::date <= p_to_date
        AND (v_is_internal OR t.customer_id = v_customer_id)
        AND (p_customer_ids IS NULL OR t.customer_id = ANY(p_customer_ids))
        AND (p_engineer_ids IS NULL OR t.assigned_user_id = ANY(p_engineer_ids))
    ),
    developer_workload AS (
      SELECT
        escalated_developer_name AS developer,
        COALESCE(team_name, 'Unknown Team') AS team,
        count(*) AS total,
        count(*) FILTER (WHERE escalation_returned_at IS NULL) AS pending,
        count(*) FILTER (WHERE escalation_returned_at IS NOT NULL) AS returned
      FROM escalations
      WHERE escalated_developer_name IS NOT NULL
      GROUP BY escalated_developer_name, team_name
      ORDER BY total DESC
    )
    SELECT jsonb_build_object(
      'metrics', (SELECT row_to_json(m) FROM metrics m),
      'ticketsByBank', (SELECT COALESCE(jsonb_agg(row_to_json(tb)), '[]'::jsonb) FROM (SELECT * FROM tickets_by_bank_all LIMIT 10) tb),
      'ticketsByBankAll', (SELECT COALESCE(jsonb_agg(row_to_json(tb)), '[]'::jsonb) FROM tickets_by_bank_all tb),
      'ticketsByProduct', (SELECT COALESCE(jsonb_agg(row_to_json(tp)), '[]'::jsonb) FROM tickets_by_product tp),
      'engineerPerformance', (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object(
            'id', ep.id,
            'name', ep.name,
            'assigned', ep.assigned,
            'resolved', ep.resolved,
            'avgTime', CASE WHEN ep.resolved > 0 THEN round((ep.total_hours / ep.resolved / 24.0)::numeric, 1) ELSE 0 END
          )
        ), '[]'::jsonb)
        FROM engineer_performance ep
      ),
      'developerWorkload', (SELECT COALESCE(jsonb_agg(row_to_json(dw)), '[]'::jsonb) FROM developer_workload dw),
      'escalations', (SELECT COALESCE(jsonb_agg(row_to_json(e)), '[]'::jsonb) FROM escalations e)
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_analytics(date, date, uuid[], uuid[]) TO authenticated;
