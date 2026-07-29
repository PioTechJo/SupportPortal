-- Critical priority is being retired; only Urgent, High, Medium, Low remain.
-- Any tickets currently on Critical are bumped to Urgent (the new top tier) before
-- the row is removed, so the FK from tickets.priority_id never dangles.

UPDATE public.tickets
SET priority_id = (SELECT id FROM public.priorities WHERE priority_code = 'URGENT')
WHERE priority_id = (SELECT id FROM public.priorities WHERE priority_code = 'CRITICAL');

DELETE FROM public.priorities WHERE priority_code = 'CRITICAL';

DELETE FROM public.system_settings WHERE setting_key = 'sla_days_critical';
