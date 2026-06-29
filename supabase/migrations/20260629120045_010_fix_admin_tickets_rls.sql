-- Security Definer function to bypass RLS on the users and roles table
CREATE OR REPLACE FUNCTION public.auth_user_role_name()
RETURNS text
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.role_name
  FROM public.users u
  JOIN public.roles r ON u.role_id = r.id
  WHERE u.id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.auth_user_customer_id()
RETURNS uuid
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT customer_id
  FROM public.users
  WHERE id = auth.uid()
  LIMIT 1;
$$;

DROP POLICY IF EXISTS "Tickets read admin" ON public.tickets;
CREATE POLICY "Tickets read admin" ON public.tickets
FOR SELECT TO authenticated USING (
  UPPER(auth_user_role_name()) IN ('ADMIN', 'ADMINISTRATOR', 'SYS_ADMIN', 'SUPPORT_MANAGER', 'SUPPORT_ENGINEER', 'TEAM_LEAD')
);

DROP POLICY IF EXISTS "Tickets read customer" ON public.tickets;
CREATE POLICY "Tickets read customer" ON public.tickets
FOR SELECT TO authenticated USING (
  customer_id = auth_user_customer_id()
  OR created_by = auth.uid()
);
