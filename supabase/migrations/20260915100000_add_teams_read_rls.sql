-- Bank users got a 403 when adding a comment because TicketDetail.tsx's
-- insert().select(...) always joins teams(team_name) (for escalation
-- comments), and the "teams" table had no SELECT policy for non-staff users
-- at all. The INSERT itself succeeded - only this follow-up join failed -
-- but the app treated the whole call as a failure, so users kept retrying
-- and created duplicate comments. Team names aren't sensitive, so just allow
-- every authenticated user to read them (matches ticket_statuses/priorities).

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.teams;
CREATE POLICY "Enable read access for authenticated users" ON public.teams
FOR SELECT TO authenticated USING (true);
