-- 1. The "ticket assigned" notice must reach the assigned resource AND the
--    Support team (the bank is covered by NEW_TICKET_CUSTOMER, sent at
--    assignment). The live DB was missing support_group here.
UPDATE public.email_templates
SET recipient_roles = '["assignee", "support_group"]'
WHERE trigger_key = 'TICKET_ASSIGNED_ENGINEER';

-- 2. Backfill project codes on tickets created before a matching maintenance
--    contract existed (the enrichment trigger only runs on INSERT).
WITH latest AS (
  SELECT DISTINCT ON (customer_id, product_id) customer_id, product_id, project_code
  FROM public.maintenance_contracts
  WHERE project_code IS NOT NULL
  ORDER BY customer_id, product_id, end_date DESC NULLS LAST, created_at DESC
)
UPDATE public.tickets t
SET ticket_no = t.ticket_no || ' - ' || l.project_code
FROM latest l
WHERE l.customer_id = t.customer_id
  AND l.product_id = t.product_id
  AND t.ticket_no NOT LIKE '%' || l.project_code;
