-- 1. Manager Identification Function
CREATE OR REPLACE FUNCTION is_manager_of_ticket(ticket_id uuid) 
RETURNS boolean AS $$
DECLARE
    assignee_id uuid;
    assignee_manager_id uuid;
BEGIN
    IF is_admin(auth.uid()) THEN RETURN true; END IF;

    -- Get the assignee and their manager
    SELECT t.assigned_to, u.manager_id 
    INTO assignee_id, assignee_manager_id
    FROM public.tickets t
    LEFT JOIN public.users u ON u.id = t.assigned_to
    WHERE t.id = ticket_id;

    IF auth.uid() = assignee_manager_id THEN
        RETURN true;
    END IF;

    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2. Row Level Security (RLS) UPDATE policy
DROP POLICY IF EXISTS "Tickets update flow" ON public.tickets;

CREATE POLICY "Tickets update flow" ON public.tickets
FOR UPDATE TO authenticated
USING (
    auth.uid() = assigned_to 
    OR is_manager_of_ticket(id)
    OR is_admin(auth.uid())
);

-- 3. State Machine Trigger
CREATE OR REPLACE FUNCTION enforce_ticket_workflow()
RETURNS trigger AS $$
DECLARE
    v_old_status_code varchar;
    v_new_status_code varchar;
BEGIN
    -- Only enforce if status is changing
    IF NEW.status_id IS DISTINCT FROM OLD.status_id THEN
        
        -- Resolve status_codes dynamically
        SELECT status_code INTO v_old_status_code FROM public.ticket_statuses WHERE id = OLD.status_id;
        SELECT status_code INTO v_new_status_code FROM public.ticket_statuses WHERE id = NEW.status_id;
        
        -- 1. -> RESOLVED_PENDING_APPROVAL (Assignee only)
        IF v_new_status_code = 'RESOLVED_PENDING_APPROVAL' THEN
            IF auth.uid() != NEW.assigned_to THEN
                RAISE EXCEPTION 'Only the assigned engineer can submit for approval.';
            END IF;
            IF NEW.resolution_justification IS NULL THEN
                RAISE EXCEPTION 'Resolution justification is required.';
            END IF;
            -- Auto-set the submission timestamp
            NEW.justification_submitted_at := now();

        -- 2. RESOLVED_PENDING_APPROVAL -> APPROVED (Manager/Admin only)
        ELSIF v_old_status_code = 'RESOLVED_PENDING_APPROVAL' AND v_new_status_code = 'APPROVED' THEN
            IF NOT is_manager_of_ticket(NEW.id) THEN
                RAISE EXCEPTION 'Only a manager or admin can approve this resolution.';
            END IF;
            -- Auto-set the approval metadata
            NEW.approved_by := auth.uid();
            NEW.approved_at := now();

        -- 3. RESOLVED_PENDING_APPROVAL -> INVESTIGATION [Rejection] (Manager/Admin only)
        ELSIF v_old_status_code = 'RESOLVED_PENDING_APPROVAL' AND v_new_status_code = 'INVESTIGATION' THEN
            IF NOT is_manager_of_ticket(NEW.id) THEN
                RAISE EXCEPTION 'Only a manager or admin can reject this resolution.';
            END IF;
            -- Rejection comment insertion is handled by the application logic, 
            -- but the status jump is protected here.

        -- 4. APPROVED -> CLOSED (Manager/Admin only)
        ELSIF v_old_status_code = 'APPROVED' AND v_new_status_code = 'CLOSED' THEN
            IF NOT is_manager_of_ticket(NEW.id) THEN
                RAISE EXCEPTION 'Only a manager or admin can close this ticket.';
            END IF;

        -- 5. Strict constraint against skipping to CLOSED
        ELSIF v_new_status_code = 'CLOSED' THEN
            RAISE EXCEPTION 'A ticket cannot jump directly to CLOSED from %', v_old_status_code;
            
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS ticket_workflow_trigger ON public.tickets;
CREATE TRIGGER ticket_workflow_trigger
BEFORE UPDATE ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION enforce_ticket_workflow();
