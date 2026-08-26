-- Closure rule per the support team's process:
--   - Tickets never escalated to another team: the assigned Support member OR
--     an admin/manager can close them.
--   - Tickets escalated to a specialized team at any point: only an admin/manager
--     can review and close (the assignee alone is not enough).

CREATE OR REPLACE FUNCTION enforce_ticket_workflow()
RETURNS trigger AS $$
DECLARE
    v_old_status_code varchar;
    v_new_status_code varchar;
    v_was_escalated boolean;
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

        -- 4. APPROVED -> CLOSED (Manager/Admin, or the assignee if never escalated)
        ELSIF v_old_status_code = 'APPROVED' AND v_new_status_code = 'CLOSED' THEN
            SELECT EXISTS (
                SELECT 1 FROM public.ticket_comments c
                WHERE c.ticket_id = NEW.id AND c.escalated_team_id IS NOT NULL
            ) INTO v_was_escalated;

            IF NOT (
                is_manager_of_ticket(NEW.id)
                OR (auth.uid() = NEW.assigned_to AND NOT v_was_escalated)
            ) THEN
                RAISE EXCEPTION 'This ticket was escalated to another team — only a manager or admin can close it.';
            END IF;

        -- 5. Strict constraint against skipping to CLOSED
        ELSIF v_new_status_code = 'CLOSED' THEN
            RAISE EXCEPTION 'A ticket cannot jump directly to CLOSED from %', v_old_status_code;

        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
