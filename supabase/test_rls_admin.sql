-- Test 2: RLS blocks non-admin insert
BEGIN;

-- 1. Create a dummy non-admin user
INSERT INTO auth.users (id, email) VALUES ('11111111-1111-1111-1111-111111111111', 'nonadmin@test.com') ON CONFLICT DO NOTHING;
INSERT INTO public.users (id, email, full_name, role_id) 
VALUES ('11111111-1111-1111-1111-111111111111', 'nonadmin@test.com', 'Non Admin', (SELECT id FROM roles WHERE role_name = 'agent' LIMIT 1)) ON CONFLICT DO NOTHING;

-- 2. Mock the JWT session for the non-admin user
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

-- 3. Attempt to insert into ai_diagnostic_categories
DO $$
BEGIN
    INSERT INTO public.ai_diagnostic_categories (product_id, category_name, display_order)
    VALUES ((SELECT id FROM products LIMIT 1), 'Hacked Category', 99);
    RAISE NOTICE 'FAIL: Insert succeeded for ai_diagnostic_categories (should have been blocked by RLS)';
EXCEPTION
    WHEN insufficient_privilege THEN
        RAISE NOTICE 'PASS: Insert blocked for ai_diagnostic_categories by RLS (insufficient_privilege)';
    WHEN OTHERS THEN
        IF SQLSTATE = '42501' THEN
           RAISE NOTICE 'PASS: Insert blocked for ai_diagnostic_categories by RLS (SQLSTATE 42501)';
        ELSE
           RAISE NOTICE 'ERROR: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
        END IF;
END $$;

-- 4. Attempt to insert into recommendation_rules
DO $$
BEGIN
    INSERT INTO public.recommendation_rules (category_id, rule_name, match_criteria, recommendation_text)
    VALUES ((SELECT id FROM ai_diagnostic_categories LIMIT 1), 'Hacked Rule', '{}'::jsonb, 'Hack');
    RAISE NOTICE 'FAIL: Insert succeeded for recommendation_rules (should have been blocked by RLS)';
EXCEPTION
    WHEN insufficient_privilege THEN
        RAISE NOTICE 'PASS: Insert blocked for recommendation_rules by RLS (insufficient_privilege)';
    WHEN OTHERS THEN
        IF SQLSTATE = '42501' THEN
           RAISE NOTICE 'PASS: Insert blocked for recommendation_rules by RLS (SQLSTATE 42501)';
        ELSE
           RAISE NOTICE 'ERROR: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
        END IF;
END $$;

ROLLBACK;
