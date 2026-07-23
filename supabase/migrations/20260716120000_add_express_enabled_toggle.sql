-- Migration: Let admins disable the Express Ticket fast-path per organization
-- (bank) in case of misuse, without notifying the bank - if they notice it's
-- gone, they're expected to reach out to their admin contact directly.

ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS express_enabled boolean NOT NULL DEFAULT true;
