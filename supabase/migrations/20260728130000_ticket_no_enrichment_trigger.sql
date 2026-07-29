-- Migration: Replace the client-side ticket_no enrichment (which silently failed for
-- bank users due to the "Tickets update flow" RLS policy — new tickets have
-- assigned_to = NULL, so their own creator can't UPDATE them) with a database trigger
-- that runs with elevated privileges right after insert, for every ticket regardless
-- of who/what created it.

CREATE OR REPLACE FUNCTION public.enrich_ticket_no_with_project_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_code text;
BEGIN
  IF NEW.customer_id IS NOT NULL AND NEW.product_id IS NOT NULL AND NEW.ticket_no IS NOT NULL THEN
    SELECT project_code INTO v_project_code
    FROM public.maintenance_contracts
    WHERE customer_id = NEW.customer_id
      AND product_id = NEW.product_id
      AND project_code IS NOT NULL
    ORDER BY end_date DESC NULLS LAST, created_at DESC
    LIMIT 1;

    IF v_project_code IS NOT NULL AND NEW.ticket_no NOT LIKE '%' || v_project_code THEN
      UPDATE public.tickets
      SET ticket_no = NEW.ticket_no || ' - ' || v_project_code
      WHERE id = NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enrich_ticket_no_trigger ON public.tickets;
CREATE TRIGGER enrich_ticket_no_trigger
AFTER INSERT ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.enrich_ticket_no_with_project_code();
