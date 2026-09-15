-- A single maintenance contract can now cover multiple products. The table
-- still stores one row per (customer, product) - that's what the ticket_no
-- enrichment trigger matches against - but rows created together as "one
-- contract" now share a contract_group_id so the UI can display/edit/delete
-- them as a single entity instead of separate contracts.

ALTER TABLE public.maintenance_contracts
  ADD COLUMN IF NOT EXISTS contract_group_id uuid DEFAULT gen_random_uuid();

-- Backfill: every existing row is its own standalone contract.
UPDATE public.maintenance_contracts
SET contract_group_id = gen_random_uuid()
WHERE contract_group_id IS NULL;
