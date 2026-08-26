-- Ticket Type: banks now pick "Support" or "Development" when filing a ticket.
-- Development tickets carry no priority (they're timeline-driven, not severity-driven)
-- and their ticket_no gets a "DV -" prefix, e.g. "DV - 22214 - LIC-MBI-BankBIrenew-02-26".
-- The bank's requested delivery date is stored in the existing sla_due_date column
-- (repurposed for Development tickets instead of the priority-based SLA calc).

ALTER TABLE public.tickets
ADD COLUMN IF NOT EXISTS ticket_type text NOT NULL DEFAULT 'SUPPORT'
  CHECK (ticket_type IN ('SUPPORT', 'DEVELOPMENT'));

ALTER TABLE public.tickets
ALTER COLUMN priority_id DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.enrich_ticket_no_with_project_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_code text;
  v_serial text;
  v_final text;
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
    v_final := v_serial || ' - ' || v_project_code;
  ELSE
    v_final := v_serial;
  END IF;

  IF NEW.ticket_type = 'DEVELOPMENT' THEN
    v_final := 'DV - ' || v_final;
  END IF;

  IF v_final IS DISTINCT FROM NEW.ticket_no THEN
    UPDATE public.tickets
    SET ticket_no = v_final
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;
