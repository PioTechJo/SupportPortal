-- Migration: Support "Express Ticket" fast-path (text-only, no diagnostic
-- wizard) so banks stop reporting urgent issues by phone/email/WhatsApp.

ALTER TABLE public.tickets
ADD COLUMN IF NOT EXISTS is_express boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_tickets_is_express ON public.tickets(is_express) WHERE is_express = true;
