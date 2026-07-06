-- Enable RLS (if not already enabled)
ALTER TABLE public.ai_diagnostic_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_diagnostic_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_question_options ENABLE ROW LEVEL SECURITY;

-- Create Policies for Authenticated users to Read (SELECT)
CREATE POLICY "Allow authenticated users to read ai_diagnostic_categories"
ON public.ai_diagnostic_categories
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to read ai_diagnostic_questions"
ON public.ai_diagnostic_questions
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to read ai_question_options"
ON public.ai_question_options
FOR SELECT
TO authenticated
USING (true);
