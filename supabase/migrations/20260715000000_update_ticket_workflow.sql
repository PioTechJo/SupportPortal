-- Migration: Update ticket workflow for final APPROVED state and sort_order swap

-- 1. Safely swap sort_order using a temporary -1 value to avoid unique constraints
UPDATE public.ticket_statuses SET sort_order = -1 WHERE status_code = 'CLOSED';
UPDATE public.ticket_statuses SET sort_order = 7 WHERE status_code = 'APPROVED';
UPDATE public.ticket_statuses SET sort_order = 6 WHERE status_code = 'CLOSED';

-- 2. Update the enforce_ticket_workflow trigger function
CREATE OR REPLACE FUNCTION enforce_ticket_workflow()
RETURNS trigger AS $$
DECLARE
    v_old_status_code varchar;
    v_new_status_code varchar;
    v_is_bank_role boolean;
BEGIN
    -- 0. Make APPROVED a fully final/locked state
    IF OLD.status_id IS NOT NULL THEN
        SELECT status_code INTO v_old_status_code FROM public.ticket_statuses WHERE id = OLD.status_id;
        IF v_old_status_code = 'APPROVED' THEN
            RAISE EXCEPTION 'A ticket cannot be changed once it is APPROVED.';
        END IF;
    END IF;

    -- Only enforce if status is changing
    IF NEW.status_id IS DISTINCT FROM OLD.status_id THEN
        
        -- Resolve status_codes dynamically
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

        -- 2. RESOLVED_PENDING_APPROVAL -> CLOSED (Manager/Admin only)
        ELSIF v_old_status_code = 'RESOLVED_PENDING_APPROVAL' AND v_new_status_code = 'CLOSED' THEN
            IF NOT is_manager_of_ticket(NEW.id) THEN
                RAISE EXCEPTION 'Only a manager or admin can close this ticket.';
            END IF;

        -- 3. RESOLVED_PENDING_APPROVAL -> INVESTIGATION [Rejection] (Manager/Admin only)
        ELSIF v_old_status_code = 'RESOLVED_PENDING_APPROVAL' AND v_new_status_code = 'INVESTIGATION' THEN
            IF NOT is_manager_of_ticket(NEW.id) THEN
                RAISE EXCEPTION 'Only a manager or admin can reject this resolution.';
            END IF;

        -- 4. CLOSED -> APPROVED (Bank roles only)
        ELSIF v_old_status_code = 'CLOSED' AND v_new_status_code = 'APPROVED' THEN
            -- Check if user is a bank role
            SELECT EXISTS (
                SELECT 1 FROM public.users u
                JOIN public.roles r ON u.role_id = r.id
                WHERE u.id = auth.uid() AND r.role_code IN ('BANK_USER', 'BANK_MANAGER', 'BANK_ADMIN')
            ) INTO v_is_bank_role;

            IF NOT v_is_bank_role THEN
                RAISE EXCEPTION 'Only a bank user can approve a closed ticket.';
            END IF;
            -- Auto-set the approval metadata
            NEW.approved_by := auth.uid();
            NEW.approved_at := now();

        -- 5. Strict constraint against skipping directly to CLOSED or APPROVED
        ELSIF v_new_status_code = 'CLOSED' OR v_new_status_code = 'APPROVED' THEN
            RAISE EXCEPTION 'A ticket cannot jump directly to % from %', v_new_status_code, v_old_status_code;
            
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
