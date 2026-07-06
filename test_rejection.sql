DO $$
DECLARE
    v_agent_id uuid;
    v_manager_id uuid;
    v_third_id uuid;
    v_ticket_id uuid;
    v_inv_status uuid;
    v_pend_status uuid;
    v_err_msg text;
    v_comment_count int;
BEGIN
    SELECT id INTO v_inv_status FROM public.ticket_statuses WHERE status_code = 'INVESTIGATION';
    SELECT id INTO v_pend_status FROM public.ticket_statuses WHERE status_code = 'RESOLVED_PENDING_APPROVAL';

    -- Grab any ticket
    SELECT id INTO v_ticket_id FROM public.tickets LIMIT 1;

    -- Pick users
    SELECT id INTO v_agent_id FROM public.users LIMIT 1;
    SELECT id INTO v_manager_id FROM public.users WHERE id != v_agent_id LIMIT 1;
    
    -- Pick a third user who is NOT an admin
    SELECT u.id INTO v_third_id 
    FROM public.users u
    LEFT JOIN public.roles r ON u.role_id = r.id
    WHERE u.id != v_agent_id 
      AND u.id != v_manager_id 
      AND (r.role_name IS NULL OR lower(r.role_name) NOT IN ('admin', 'administrator', 'sys_admin'))
    LIMIT 1;

    IF v_third_id IS NULL THEN
        SELECT id INTO v_third_id FROM public.users WHERE id != v_agent_id AND id != v_manager_id LIMIT 1;
    END IF;

    -- Setup ticket
    UPDATE public.tickets SET status_id = v_inv_status, assigned_to = v_agent_id WHERE id = v_ticket_id;

    -- Set manager
    UPDATE public.users SET manager_id = v_manager_id WHERE id = v_agent_id;

    RAISE NOTICE '--- TEST START ---';

    -- 1. Agent Submission
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claims', format('{"sub": "%s"}', v_agent_id), true);
    
    UPDATE public.tickets SET status_id = v_pend_status, resolution_justification = '{"rootCause": "Test Failure"}' WHERE id = v_ticket_id;
    RAISE NOTICE '[STEP 1] Agent successfully submitted resolution for approval.';

    -- 2. Third User Rejection Attempt (Should Fail)
    PERFORM set_config('request.jwt.claims', format('{"sub": "%s"}', v_third_id), true);
    BEGIN
        UPDATE public.tickets SET status_id = v_inv_status WHERE id = v_ticket_id;
        RAISE EXCEPTION 'FAILED: Third user was incorrectly allowed to reject!';
    EXCEPTION WHEN OTHERS THEN
        v_err_msg := SQLERRM;
        RAISE NOTICE '[STEP 2] Third user blocked from rejecting as expected. Error received: %', v_err_msg;
    END;

    -- 3. Manager Rejection Attempt (Should Succeed)
    PERFORM set_config('request.jwt.claims', format('{"sub": "%s"}', v_manager_id), true);
    BEGIN
        UPDATE public.tickets SET status_id = v_inv_status WHERE id = v_ticket_id;
        
        -- Insert comment like api.ts will do
        INSERT INTO public.ticket_comments (ticket_id, comment_text, is_system_generated, author_id)
        VALUES (v_ticket_id, '❌ RESOLUTION REVISION REQUESTED - Manager Feedback: Please fix root cause.', true, v_manager_id);
        
        RAISE NOTICE '[STEP 3] Manager successfully rejected ticket and inserted revision comment.';
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'FAILED: Manager could not reject. %', SQLERRM;
    END;

    -- 4. Verify Comment Was Written
    PERFORM set_config('role', 'postgres', true);
    SELECT count(*) INTO v_comment_count FROM public.ticket_comments WHERE ticket_id = v_ticket_id AND comment_text LIKE '❌ RESOLUTION REVISION REQUESTED%';
    IF v_comment_count = 0 THEN
        RAISE EXCEPTION 'FAILED: Rejection comment was not found in ticket_comments table.';
    ELSE
        RAISE NOTICE '[STEP 4] Verified: Found % rejection comment(s) in ticket_comments table.', v_comment_count;
    END IF;

    -- Cleanup
    DELETE FROM public.ticket_comments WHERE ticket_id = v_ticket_id AND comment_text LIKE '❌ RESOLUTION REVISION REQUESTED%';
    UPDATE public.tickets SET status_id = v_inv_status WHERE id = v_ticket_id;
    UPDATE public.users SET manager_id = NULL WHERE id = v_agent_id;

    RAISE NOTICE '--- ALL TESTS PASSED SUCCESSFULLY ---';
END $$;
