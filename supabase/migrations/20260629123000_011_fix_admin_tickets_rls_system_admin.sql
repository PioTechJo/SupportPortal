-- Drop the existing policy
DROP POLICY IF EXISTS "Tickets read admin" ON public.tickets;

-- Recreate it with the added 'SYSTEM ADMINISTRATOR' role
CREATE POLICY "Tickets read admin" ON public.tickets
FOR SELECT TO authenticated USING (
  UPPER(auth_user_role_name()) IN ('ADMIN', 'ADMINISTRATOR', 'SYS_ADMIN', 'SYSTEM ADMINISTRATOR', 'SUPPORT_MANAGER', 'SUPPORT_ENGINEER', 'TEAM_LEAD')
);
