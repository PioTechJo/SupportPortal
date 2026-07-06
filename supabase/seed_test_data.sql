DO $$ 
DECLARE
    v_dwh_id UUID;
    v_dl_id UUID;
    v_cat_conn UUID;
    v_cat_perf UUID;
    v_q_users UUID;
    v_q_time UUID;
    v_q_slow UUID;
BEGIN
    -- 1. Look up products
    SELECT id INTO v_dwh_id FROM public.products WHERE product_name ILIKE '%DWH Enterprise%' LIMIT 1;
    SELECT id INTO v_dl_id FROM public.products WHERE product_name ILIKE '%Data Lake%' LIMIT 1;

    IF v_dwh_id IS NULL THEN
        RAISE NOTICE 'Product DWH Enterprise not found. Creating dummy...';
        INSERT INTO public.products (product_code, product_name, is_active) VALUES ('DWH-TEMP', 'DWH Enterprise', true) RETURNING id INTO v_dwh_id;
    END IF;

    IF v_dl_id IS NULL THEN
        RAISE NOTICE 'Product Data Lake not found. Creating dummy...';
        INSERT INTO public.products (product_code, product_name, is_active) VALUES ('DL-TEMP', 'Data Lake', true) RETURNING id INTO v_dl_id;
    END IF;

    -- 2. Clean up previous seed data (optional, but good for rerunning)
    DELETE FROM public.recommendation_rules;
    DELETE FROM public.ai_question_options;
    DELETE FROM public.ai_diagnostic_questions;
    DELETE FROM public.ai_diagnostic_categories;

    -- 3. Insert Categories
    INSERT INTO public.ai_diagnostic_categories (product_id, category_name, display_order)
    VALUES (v_dwh_id, 'Connectivity Issues', 1)
    RETURNING id INTO v_cat_conn;

    INSERT INTO public.ai_diagnostic_categories (product_id, category_name, display_order)
    VALUES (v_dl_id, 'Performance Issues', 1)
    RETURNING id INTO v_cat_perf;

    -- 4. Insert Questions for DWH Connectivity
    INSERT INTO public.ai_diagnostic_questions (category_id, question_text, question_type, display_order)
    VALUES (v_cat_conn, 'Is the issue affecting all users or specific users?', 'radio', 1)
    RETURNING id INTO v_q_users;

    INSERT INTO public.ai_diagnostic_questions (category_id, question_text, question_type, display_order)
    VALUES (v_cat_conn, 'When did this issue start?', 'text', 2)
    RETURNING id INTO v_q_time;

    -- Insert Options for DWH Users question
    INSERT INTO public.ai_question_options (question_id, option_value, display_order) VALUES 
    (v_q_users, 'All users', 1),
    (v_q_users, 'Specific users', 2),
    (v_q_users, 'Intermittent', 3);

    -- 5. Insert Questions for Data Lake Performance
    INSERT INTO public.ai_diagnostic_questions (category_id, question_text, question_type, display_order)
    VALUES (v_cat_perf, 'Are queries slower than usual?', 'radio', 1)
    RETURNING id INTO v_q_slow;

    -- Insert Options for Data Lake Slow question
    INSERT INTO public.ai_question_options (question_id, option_value, display_order) VALUES 
    (v_q_slow, 'Yes', 1),
    (v_q_slow, 'No', 2);

    -- 6. Insert Recommendation Rules
    -- Rule 1: DWH Connectivity, All users
    INSERT INTO public.recommendation_rules (category_id, match_criteria, confidence_score, recommendation_text, root_cause_text)
    VALUES (
        v_cat_conn, 
        jsonb_build_object(v_q_users::text, 'All users'),
        0.95,
        'Please check the VPN gateway and primary authentication server, as a global outage indicates a core infrastructure issue.',
        'Core network route or authentication service failure affecting all incoming connections.'
    );

    -- Rule 2: DWH Connectivity, Specific users
    INSERT INTO public.recommendation_rules (category_id, match_criteria, confidence_score, recommendation_text, root_cause_text)
    VALUES (
        v_cat_conn, 
        jsonb_build_object(v_q_users::text, 'Specific users'),
        0.85,
        'Verify the user accounts in Active Directory to ensure they are not locked out and have the correct group policies applied.',
        'User-specific account lockouts or profile misconfigurations.'
    );

    -- Rule 3: Data Lake Performance, Yes
    INSERT INTO public.recommendation_rules (category_id, match_criteria, confidence_score, recommendation_text, root_cause_text)
    VALUES (
        v_cat_perf, 
        jsonb_build_object(v_q_slow::text, 'Yes'),
        0.80,
        'Analyze query execution plans and ensure table statistics are up-to-date. Check for blocking locks on highly concurrent tables.',
        'Stale statistics or inefficient query execution plans causing high CPU/IO waits.'
    );

END $$;

-- Validation Query 1: Tree of Product -> Category -> Questions -> Options
SELECT 
    p.product_name,
    c.category_name,
    q.question_text,
    o.option_value
FROM 
    public.ai_diagnostic_categories c
JOIN 
    public.products p ON p.id = c.product_id
JOIN 
    public.ai_diagnostic_questions q ON q.category_id = c.id
LEFT JOIN 
    public.ai_question_options o ON o.question_id = q.id
ORDER BY 
    p.product_name, c.display_order, q.display_order, o.display_order;

-- Validation Query 2: Recommendation Rules
SELECT 
    c.category_name,
    rr.match_criteria,
    rr.recommendation_text
FROM 
    public.recommendation_rules rr
JOIN
    public.ai_diagnostic_categories c ON c.id = rr.category_id;
