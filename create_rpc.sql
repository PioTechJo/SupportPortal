CREATE OR REPLACE FUNCTION public.get_dashboard_analytics(
    p_from_date date,
    p_to_date date,
    p_customer_ids uuid[] DEFAULT '{}',
    p_engineer_ids uuid[] DEFAULT '{}'
) RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
AS $$
  WITH filtered_tickets AS (
    SELECT 
      t.*, 
      ts.status_name, 
      ts.status_code, 
      c.customer_name, 
      p.product_name, 
      pr.priority_name, 
      u.full_name as assigned_to_name
    FROM public.tickets t
    LEFT JOIN public.ticket_statuses ts ON t.status_id = ts.id
    LEFT JOIN public.customers c ON t.customer_id = c.id
    LEFT JOIN public.products p ON t.product_id = p.id
    LEFT JOIN public.priorities pr ON t.priority_id = pr.id
    LEFT JOIN public.users u ON t.assigned_user_id = u.id
    WHERE t.created_at::date >= p_from_date 
      AND t.created_at::date <= p_to_date
      AND (array_length(p_customer_ids, 1) IS NULL OR t.customer_id = ANY(p_customer_ids))
      AND (array_length(p_engineer_ids, 1) IS NULL OR t.assigned_user_id = ANY(p_engineer_ids))
  ),
  metrics AS (
    SELECT 
      count(*) filter (where status_code = 'NEW') as new_tickets,
      count(*) filter (where status_code = 'REOPENED') as reopened_tickets,
      count(*) filter (where status_code = 'INVESTIGATION') as in_progress_tickets,
      count(*) filter (where status_code IN ('CLOSED', 'APPROVED')) as closed_tickets
    FROM filtered_tickets
  ),
  tickets_by_bank AS (
    SELECT COALESCE(customer_name, 'Global Core') as name, count(*) as count
    FROM filtered_tickets
    GROUP BY COALESCE(customer_name, 'Global Core')
    ORDER BY count DESC
    LIMIT 10
  ),
  tickets_by_product AS (
    SELECT COALESCE(product_name, 'PIO-INTEGRATOR API Gateway') as name, count(*) as value
    FROM filtered_tickets
    GROUP BY COALESCE(product_name, 'PIO-INTEGRATOR API Gateway')
  ),
  engineer_performance AS (
    SELECT 
      COALESCE(assigned_user_id::text, 'unassigned') as id,
      COALESCE(assigned_to_name, 'Unassigned') as name,
      count(*) as assigned,
      count(*) filter (where status_code IN ('RESOLVED', 'CLOSED', 'APPROVED') OR status_code IS NULL) as resolved,
      COALESCE(
        sum(EXTRACT(EPOCH FROM (COALESCE(closed_at, approved_at, updated_at) - created_at)) / 3600.0) 
        filter (where status_code IN ('RESOLVED', 'CLOSED', 'APPROVED') OR status_code IS NULL), 
        0
      ) as total_hours
    FROM filtered_tickets
    GROUP BY assigned_user_id, assigned_to_name
  ),
  escalations AS (
    SELECT 
      e.id, e.ticket_id, e.created_at, e.escalated_team_id, e.escalated_developer_name, e.escalation_returned_at, e.is_internal, e.is_system_generated,
      t.ticket_no, 
      t.subject, 
      tm.team_name, 
      u2.full_name as assigned_to_name,
      t.customer_id
    FROM public.ticket_comments e
    JOIN public.tickets t ON e.ticket_id = t.id
    LEFT JOIN public.teams tm ON e.escalated_team_id = tm.id
    LEFT JOIN public.users u2 ON t.assigned_user_id = u2.id
    WHERE e.is_internal = true 
      AND e.escalated_team_id IS NOT NULL
      AND t.created_at::date >= p_from_date 
      AND t.created_at::date <= p_to_date
      AND (array_length(p_customer_ids, 1) IS NULL OR t.customer_id = ANY(p_customer_ids))
      AND (array_length(p_engineer_ids, 1) IS NULL OR t.assigned_user_id = ANY(p_engineer_ids))
  ),
  developer_workload AS (
    SELECT 
      escalated_developer_name as developer,
      COALESCE(team_name, 'Unknown Team') as team,
      count(*) as total,
      count(*) filter (where escalation_returned_at IS NULL) as pending,
      count(*) filter (where escalation_returned_at IS NOT NULL) as returned
    FROM escalations
    WHERE escalated_developer_name IS NOT NULL
    GROUP BY escalated_developer_name, team_name
    ORDER BY total DESC
  )
  
  SELECT jsonb_build_object(
    'metrics', (SELECT row_to_json(m) FROM metrics m),
    'ticketsByBank', (SELECT COALESCE(jsonb_agg(row_to_json(tb)), '[]'::jsonb) FROM tickets_by_bank tb),
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
  );
$$;
