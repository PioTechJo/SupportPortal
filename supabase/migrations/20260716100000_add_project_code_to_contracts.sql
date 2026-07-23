-- Migration: Add project_code field to maintenance_contracts (Add Contract form).

ALTER TABLE public.maintenance_contracts
ADD COLUMN IF NOT EXISTS project_code text;
