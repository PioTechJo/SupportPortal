-- system_settings had read-only RLS (or none for writes), so the SLA Configuration
-- page's upsert always failed for admins with a 42501 RLS violation. This was a
-- pre-existing gap, unrelated to the Critical-priority removal that surfaced it.

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow admins to insert system_settings" ON public.system_settings;
CREATE POLICY "Allow admins to insert system_settings" ON public.system_settings
FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Allow admins to update system_settings" ON public.system_settings;
CREATE POLICY "Allow admins to update system_settings" ON public.system_settings
FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Allow authenticated users to read system_settings" ON public.system_settings;
CREATE POLICY "Allow authenticated users to read system_settings" ON public.system_settings
FOR SELECT TO authenticated
USING (true);
