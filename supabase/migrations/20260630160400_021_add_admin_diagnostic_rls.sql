-- Mutate Access for ai_diagnostic_categories
DROP POLICY IF EXISTS "Allow admins to insert ai_diagnostic_categories" ON public.ai_diagnostic_categories;
CREATE POLICY "Allow admins to insert ai_diagnostic_categories" ON public.ai_diagnostic_categories FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Allow admins to update ai_diagnostic_categories" ON public.ai_diagnostic_categories;
CREATE POLICY "Allow admins to update ai_diagnostic_categories" ON public.ai_diagnostic_categories FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Allow admins to delete ai_diagnostic_categories" ON public.ai_diagnostic_categories;
CREATE POLICY "Allow admins to delete ai_diagnostic_categories" ON public.ai_diagnostic_categories FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- Mutate Access for ai_diagnostic_questions
DROP POLICY IF EXISTS "Allow admins to insert ai_diagnostic_questions" ON public.ai_diagnostic_questions;
CREATE POLICY "Allow admins to insert ai_diagnostic_questions" ON public.ai_diagnostic_questions FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Allow admins to update ai_diagnostic_questions" ON public.ai_diagnostic_questions;
CREATE POLICY "Allow admins to update ai_diagnostic_questions" ON public.ai_diagnostic_questions FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Allow admins to delete ai_diagnostic_questions" ON public.ai_diagnostic_questions;
CREATE POLICY "Allow admins to delete ai_diagnostic_questions" ON public.ai_diagnostic_questions FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- Mutate Access for ai_question_options
DROP POLICY IF EXISTS "Allow admins to insert ai_question_options" ON public.ai_question_options;
CREATE POLICY "Allow admins to insert ai_question_options" ON public.ai_question_options FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Allow admins to update ai_question_options" ON public.ai_question_options;
CREATE POLICY "Allow admins to update ai_question_options" ON public.ai_question_options FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Allow admins to delete ai_question_options" ON public.ai_question_options;
CREATE POLICY "Allow admins to delete ai_question_options" ON public.ai_question_options FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
