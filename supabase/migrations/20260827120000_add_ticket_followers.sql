-- When an admin creates a ticket on behalf of a bank, they can pick which
-- bank user(s) should receive notifications for that ticket (its "followers"),
-- since the ticket's created_by is the admin, not anyone at the bank.

CREATE TABLE IF NOT EXISTS public.ticket_followers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (ticket_id, user_id)
);

ALTER TABLE public.ticket_followers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ticket_followers_isolation" ON public.ticket_followers;
CREATE POLICY "ticket_followers_isolation" ON public.ticket_followers
FOR ALL TO authenticated USING (
  public.is_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_followers.ticket_id
    AND (t.customer_id = public.auth_user_customer_id() OR t.created_by = auth.uid() OR t.assigned_to = auth.uid())
  )
) WITH CHECK (
  public.is_admin(auth.uid())
);
