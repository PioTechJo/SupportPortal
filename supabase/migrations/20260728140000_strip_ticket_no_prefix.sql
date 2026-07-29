-- Migration: Drop the "TKT-YYYY-" prefix from newly created tickets' ticket_no,
-- keeping just the serial number (optionally followed by " - <project_code>").
-- Example: "TKT-2026-004541" -> "004541", or "004541 - LIC-ISB-goAMLrenew-07-26"
-- if a matching maintenance contract exists.

CREATE OR REPLACE FUNCTION public.enrich_ticket_no_with_project_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_code text;
  v_serial text;
BEGIN
  IF NEW.ticket_no IS NULL THEN
    RETURN NEW;
  END IF;

  -- Strip a leading "TKT-<year>-" prefix, if present, leaving just the serial digits.
  v_serial := regexp_replace(NEW.ticket_no, '^TKT-\d{4}-', '');

  IF NEW.customer_id IS NOT NULL AND NEW.product_id IS NOT NULL THEN
    SELECT project_code INTO v_project_code
    FROM public.maintenance_contracts
    WHERE customer_id = NEW.customer_id
      AND product_id = NEW.product_id
      AND project_code IS NOT NULL
    ORDER BY end_date DESC NULLS LAST, created_at DESC
    LIMIT 1;
  END IF;

  IF v_project_code IS NOT NULL THEN
    UPDATE public.tickets
    SET ticket_no = v_serial || ' - ' || v_project_code
    WHERE id = NEW.id;
  ELSIF v_serial IS DISTINCT FROM NEW.ticket_no THEN
    UPDATE public.tickets
    SET ticket_no = v_serial
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enrich_ticket_no_trigger ON public.tickets;
CREATE TRIGGER enrich_ticket_no_trigger
AFTER INSERT ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.enrich_ticket_no_with_project_code();
