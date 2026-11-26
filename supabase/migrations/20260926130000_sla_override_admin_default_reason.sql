-- Administrators can change a ticket's SLA Due Date without giving a reason;
-- it is recorded as "Changed by admin". The assigned engineer still has to
-- provide a reason.

CREATE OR REPLACE FUNCTION public.log_sla_due_date_override(p_ticket_id uuid, p_new_due_date timestamp with time zone, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_can_edit boolean;
  v_is_admin boolean := COALESCE(public.is_admin(auth.uid()), false);
  v_reason text := NULLIF(btrim(COALESCE(p_reason, '')), '');
BEGIN
  -- Administrators don't have to give a reason; it defaults to "Changed by admin".
  IF v_reason IS NULL THEN
    IF v_is_admin THEN
      v_reason := 'Changed by admin';
    ELSE
      RAISE EXCEPTION 'A reason is required to change the SLA Due Date.';
    END IF;
  END IF;

  SELECT (auth.uid() = assigned_to OR v_is_admin)
  INTO v_can_edit
  FROM public.tickets
  WHERE id = p_ticket_id;

  IF NOT COALESCE(v_can_edit, false) THEN
    RAISE EXCEPTION 'Only the assigned engineer or an administrator can change the SLA Due Date.';
  END IF;

  UPDATE public.tickets
  SET
    sla_due_date = p_new_due_date,
    sla_due_date_override_reason = v_reason,
    sla_due_date_override_by = auth.uid(),
    sla_due_date_override_at = now()
  WHERE id = p_ticket_id;
END;
$function$;
