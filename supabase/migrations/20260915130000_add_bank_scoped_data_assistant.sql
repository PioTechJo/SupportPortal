-- Bank-facing "Ask Your Data": unlike execute_readonly_query (SECURITY DEFINER,
-- admin-only, deliberately bypasses RLS so admins can see everything), this
-- version is SECURITY INVOKER - it runs with the CALLING USER's own database
-- role, so the existing RLS policies on tickets/ticket_comments/etc. (which
-- already scope bank users to their own customer_id) enforce themselves
-- automatically, no matter what SQL the AI-generated query contains. This is
-- real row-level enforcement, not a prompt instruction the AI could ignore.

CREATE OR REPLACE FUNCTION public.execute_readonly_query_scoped(p_query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  normalized_query text;
  clean_query text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  normalized_query := lower(trim(p_query));

  IF normalized_query NOT LIKE 'select%' THEN
    RAISE EXCEPTION 'Only SELECT statements are allowed';
  END IF;

  IF normalized_query ~* '(insert|update|delete|drop|alter|truncate|grant|revoke|create|execute|call|copy|vacuum|;.*select)' THEN
    RAISE EXCEPTION 'Query contains forbidden keywords';
  END IF;

  clean_query := regexp_replace(trim(p_query), ';\s*$', '');

  SET LOCAL statement_timeout = '5s';

  EXECUTE 'SELECT jsonb_agg(t) FROM (' || clean_query || ') t' INTO result;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.execute_readonly_query_scoped(text) TO authenticated;
