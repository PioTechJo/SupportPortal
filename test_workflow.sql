DO $$
DECLARE
    v_agent_id uuid;
    v_manager_id uuid;
    v_ticket_id uuid;
    v_inv_status uuid;
    v_pend_status uuid;
    v_appr_status uuid;
BEGIN
    SELECT id INTO v_inv_status FROM public.ticket_statuses WHERE status_code = 'INVESTIGATION';
    SELECT id INTO v_pend_status FROM public.ticket_statuses WHERE status_code = 'RESOLVED_PENDING_APPROVAL';
    SELECT id INTO v_appr_status FROM public.ticket_statuses WHERE status_code = 'APPROVED';

    -- Grab any ticket
    SELECT id INTO v_ticket_id FROM public.tickets LIMIT 1;
    IF v_ticket_id IS NULL THEN
        RAISE EXCEPTION 'No tickets found in database. Cannot run test.';
    END IF;

    -- Set it to INVESTIGATION
    UPDATE public.tickets SET status_id = v_inv_status WHERE id = v_ticket_id;

    -- Pick users
    SELECT id INTO v_agent_id FROM public.users LIMIT 1;
    SELECT id INTO v_manager_id FROM public.users WHERE id != v_agent_id LIMIT 1;

    -- Assign ticket to agent
    UPDATE public.tickets SET assigned_to = v_agent_id WHERE id = v_ticket_id;

    -- Set manager
    UPDATE public.users SET manager_id = v_manager_id WHERE id = v_agent_id;

    RAISE NOTICE 'Testing with Ticket: %', v_ticket_id;
    RAISE NOTICE 'Agent: %, Manager: %', v_agent_id, v_manager_id;

    -- Agent Submission
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claims', format('{"sub": "%s"}', v_agent_id), true);

    BEGIN
        UPDATE public.tickets 
        SET status_id = v_pend_status, resolution_justification = '{"rootCause": "Test"}'
        WHERE id = v_ticket_id;
        RAISE NOTICE 'SUCCESS: Agent submitted resolution.';
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'FAILED: Agent could not submit resolution. %', SQLERRM;
    END;

    -- Manager Approval
    PERFORM set_config('request.jwt.claims', format('{"sub": "%s"}', v_manager_id), true);

    BEGIN
        UPDATE public.tickets 
        SET status_id = v_appr_status
        WHERE id = v_ticket_id;
        RAISE NOTICE 'SUCCESS: Manager approved resolution.';
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'FAILED: Manager could not approve. %', SQLERRM;
    END;

    -- Reset state
    PERFORM set_config('role', 'postgres', true);
    UPDATE public.tickets SET status_id = v_inv_status WHERE id = v_ticket_id;
    UPDATE public.users SET manager_id = NULL WHERE id = v_agent_id;

    RAISE NOTICE 'ALL TESTS PASSED SUCCESSFULLY.';
END $$;
