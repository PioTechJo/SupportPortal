-- Bank users could never add a comment on their own ticket: the INSERT
-- policy on ticket_comments only covered internal staff roles (admin,
-- support manager/lead/engineer, team member), unlike its SELECT policy
-- which already had a branch letting the ticket's own bank user read
-- non-internal comments. Add the matching INSERT branch.

DROP POLICY IF EXISTS "ticket_comments_insert_team_member" ON public.ticket_comments;
CREATE POLICY "ticket_comments_insert_team_member" ON public.ticket_comments
FOR INSERT TO public
WITH CHECK (
  is_admin(auth.uid())
  OR (auth_user_role_code() = ANY (ARRAY['SUPPORT_MANAGER'::text, 'TEAM_LEAD'::text, 'SUPPORT_ENGINEER'::text]))
  OR ((auth_user_role_code() = 'TEAM_MEMBER'::text) AND (author_id = auth.uid()))
  OR (
    (is_internal = false)
    AND (author_id = auth.uid())
    AND (COALESCE(is_system_generated, false) = false)
    AND EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_comments.ticket_id
        AND (t.customer_id = auth_user_customer_id() OR t.created_by = auth.uid())
    )
  )
);
