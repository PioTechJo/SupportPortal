ALTER FUNCTION public.auth_user_customer_id() STABLE;
ALTER FUNCTION public.auth_user_role_name() STABLE;
ALTER FUNCTION public.is_internal_role(uuid) STABLE;

DROP POLICY IF EXISTS "bank_users_select_tickets" ON public.tickets;
DROP POLICY IF EXISTS "bank_users_insert_tickets" ON public.tickets;
