-- Ensure administrators and support staff can see all tickets
DROP POLICY IF EXISTS "Tickets read admin" ON public.tickets;
CREATE POLICY "Tickets read admin" ON public.tickets
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.roles r ON u.role_id = r.id
    WHERE u.id = auth.uid()
    AND UPPER(r.role_name) IN ('ADMIN', 'ADMINISTRATOR', 'SYS_ADMIN', 'SUPPORT_MANAGER', 'SUPPORT_ENGINEER', 'TEAM_LEAD')
  )
);

-- Ensure customers can still see their own tickets
DROP POLICY IF EXISTS "Tickets read customer" ON public.tickets;
CREATE POLICY "Tickets read customer" ON public.tickets
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()
    AND u.customer_id = tickets.customer_id
  )
  OR created_by = auth.uid()
);
