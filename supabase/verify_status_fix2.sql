SELECT json_build_object(
  'has_status_col', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'status'),
  'statuses', (SELECT json_agg(json_build_object('code', status_code, 'order', sort_order) ORDER BY sort_order) FROM ticket_statuses),
  'ticket_statuses', (SELECT json_agg(ts.status_code) FROM tickets t JOIN ticket_statuses ts ON t.status_id = ts.id LIMIT 5)
);
