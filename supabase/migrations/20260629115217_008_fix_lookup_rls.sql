-- Fix RLS for lookup tables so the authenticated role can query them
-- ticket_statuses
CREATE POLICY "Enable read access for authenticated users" ON public.ticket_statuses
FOR SELECT TO authenticated USING (true);

-- priorities
CREATE POLICY "Enable read access for authenticated users" ON public.priorities
FOR SELECT TO authenticated USING (true);
