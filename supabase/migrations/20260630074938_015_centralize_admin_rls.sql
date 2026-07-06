-- 1. Create is_admin function
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.users u
    JOIN public.roles r ON u.role_id = r.id
    WHERE u.id = uid 
      AND r.role_name = 'System Administrator'
  );
$$;

-- 2. Refactor existing RLS policies on tickets
DROP POLICY IF EXISTS "Tickets read admin" ON public.tickets;
CREATE POLICY "Tickets read admin" ON public.tickets
FOR SELECT TO authenticated USING (
  is_admin(auth.uid()) OR 
  UPPER(auth_user_role_name()) IN ('SUPPORT_MANAGER', 'SUPPORT_ENGINEER', 'TEAM_LEAD')
);

DROP POLICY IF EXISTS "admin_agent_insert_tickets" ON public.tickets;
CREATE POLICY "admin_agent_insert_tickets" ON public.tickets
FOR INSERT TO authenticated WITH CHECK (
  is_admin(auth.uid()) OR 
  EXISTS (
    SELECT 1 FROM public.users u 
    JOIN public.roles r ON u.role_id = r.id 
    WHERE u.id = auth.uid() AND r.role_code = 'AGENT'
  )
);

-- 3. Add RLS Policies for New Sub-Tables
ALTER TABLE public.ticket_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ticket_answers_isolation" ON public.ticket_answers;
CREATE POLICY "ticket_answers_isolation" ON public.ticket_answers
FOR ALL TO authenticated USING (
  is_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.tickets t 
    WHERE t.id = ticket_answers.ticket_id 
    AND (t.customer_id = auth_user_customer_id() OR t.created_by = auth.uid())
  )
) WITH CHECK (
  is_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.tickets t 
    WHERE t.id = ticket_answers.ticket_id 
    AND (t.customer_id = auth_user_customer_id() OR t.created_by = auth.uid())
  )
);

DROP POLICY IF EXISTS "ticket_comments_isolation" ON public.ticket_comments;
CREATE POLICY "ticket_comments_isolation" ON public.ticket_comments
FOR ALL TO authenticated USING (
  is_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.tickets t 
    WHERE t.id = ticket_comments.ticket_id 
    AND (t.customer_id = auth_user_customer_id() OR t.created_by = auth.uid())
  )
) WITH CHECK (
  is_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.tickets t 
    WHERE t.id = ticket_comments.ticket_id 
    AND (t.customer_id = auth_user_customer_id() OR t.created_by = auth.uid())
  )
);

DROP POLICY IF EXISTS "recommendation_rules_read" ON public.recommendation_rules;
CREATE POLICY "recommendation_rules_read" ON public.recommendation_rules
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "recommendation_rules_write" ON public.recommendation_rules;
CREATE POLICY "recommendation_rules_write" ON public.recommendation_rules
FOR ALL TO authenticated USING (
  is_admin(auth.uid())
) WITH CHECK (
  is_admin(auth.uid())
);
