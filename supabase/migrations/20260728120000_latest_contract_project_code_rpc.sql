-- Migration: Expose a narrow, security-definer RPC so ANY authenticated ticket creator
-- (including bank users, who are blocked by RLS from reading maintenance_contracts directly)
-- can look up the project_code of their most recent contract for a given product.
-- Only the project_code string is ever returned — no pricing, dates, or other contract
-- details leak to non-admin roles.

CREATE OR REPLACE FUNCTION public.get_latest_contract_project_code(
    p_customer_id uuid,
    p_product_id uuid
) RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT project_code
  FROM public.maintenance_contracts
  WHERE customer_id = p_customer_id
    AND product_id = p_product_id
    AND project_code IS NOT NULL
  ORDER BY end_date DESC NULLS LAST, created_at DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_latest_contract_project_code(uuid, uuid) TO authenticated;
