SELECT count(*) FROM tickets WHERE status_id = (SELECT id FROM ticket_statuses WHERE status_code = 'RESOLVED');
