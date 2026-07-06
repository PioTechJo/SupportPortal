-- 1. Shift the existing RESOLVED and CLOSED rows' sort_order up by 1 each to make room
UPDATE ticket_statuses SET sort_order = 7 WHERE status_code = 'CLOSED';
UPDATE ticket_statuses SET sort_order = 6 WHERE status_code = 'RESOLVED';

-- Insert two new rows into ticket_statuses to support our approval workflow
INSERT INTO ticket_statuses (id, status_code, status_name, sort_order)
VALUES 
  (gen_random_uuid(), 'RESOLVED_PENDING_APPROVAL', 'Resolved - Pending Approval', 5),
  (gen_random_uuid(), 'APPROVED', 'Approved', 6);

-- 2. Drop the redundant text column tickets.status entirely
ALTER TABLE tickets DROP COLUMN status;
