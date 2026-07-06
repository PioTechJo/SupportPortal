-- 2. Delete the redundant RESOLVED row (count was 0)
DELETE FROM ticket_statuses WHERE status_code = 'RESOLVED';

-- 3. Ensure the sort_order is perfectly clean with no gaps
UPDATE ticket_statuses SET sort_order = 1 WHERE status_code = 'NEW';
UPDATE ticket_statuses SET sort_order = 2 WHERE status_code = 'ASSIGNED';
UPDATE ticket_statuses SET sort_order = 3 WHERE status_code = 'INVESTIGATION';
UPDATE ticket_statuses SET sort_order = 4 WHERE status_code = 'PENDING_CUSTOMER';
UPDATE ticket_statuses SET sort_order = 5 WHERE status_code = 'RESOLVED_PENDING_APPROVAL';
UPDATE ticket_statuses SET sort_order = 6 WHERE status_code = 'APPROVED';
UPDATE ticket_statuses SET sort_order = 7 WHERE status_code = 'CLOSED';
