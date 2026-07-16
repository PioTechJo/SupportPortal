-- Bug 2: Run RPC directly to get the actual Postgres error
SELECT get_dashboard_analytics('2020-01-01'::date, '2026-12-31'::date, '{}'::uuid[], '{}'::uuid[]);
