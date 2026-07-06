-- Enable RLS
ALTER TABLE public.recommendation_rules ENABLE ROW LEVEL SECURITY;

-- Ensure authenticated read is present (we might have added this earlier, but just in case, use IF NOT EXISTS if possible, but standard PG 11+ supports CREATE POLICY ... ON ... if we just drop it first to be safe)
DROP POLICY IF EXISTS "Allow authenticated users to read recommendation_rules" ON public.recommendation_rules;
CREATE POLICY "Allow authenticated users to read recommendation_rules"
ON public.recommendation_rules
FOR SELECT
TO authenticated
USING (true);

-- Admin Mutate Access (Insert, Update, Delete)
DROP POLICY IF EXISTS "Allow admins to insert recommendation_rules" ON public.recommendation_rules;
CREATE POLICY "Allow admins to insert recommendation_rules"
ON public.recommendation_rules
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Allow admins to update recommendation_rules" ON public.recommendation_rules;
CREATE POLICY "Allow admins to update recommendation_rules"
ON public.recommendation_rules
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Allow admins to delete recommendation_rules" ON public.recommendation_rules;
CREATE POLICY "Allow admins to delete recommendation_rules"
ON public.recommendation_rules
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));
