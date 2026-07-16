-- Test the new SECURITY DEFINER RPC as authenticated role
-- (simulates what the frontend calls)
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "00000000-0000-0000-0000-000000000000", "role": "authenticated"}';
SELECT get_dashboard_analytics('2020-01-01'::date, '2026-12-31'::date, NULL, NULL);
