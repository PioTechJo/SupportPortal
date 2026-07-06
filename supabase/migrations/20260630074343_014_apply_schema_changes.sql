-- 1. ALTER TABLE products
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS icon text,
ADD COLUMN IF NOT EXISTS color text,
ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;

-- 2. ALTER TABLE tickets
ALTER TABLE public.tickets DROP COLUMN IF EXISTS status CASCADE;

ALTER TABLE public.tickets
ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.ai_diagnostic_categories(id),
ADD COLUMN status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'pending_questions', 'recommendation_shown', 'assigned', 'in_progress', 'resolved_pending_approval', 'approved', 'closed')),
ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS duplicate_of uuid REFERENCES public.tickets(id),
ADD COLUMN IF NOT EXISTS resolution_justification text,
ADD COLUMN IF NOT EXISTS justification_submitted_at timestamptz,
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at timestamptz,
ADD COLUMN IF NOT EXISTS last_progress_comment_at timestamptz;

-- 3. CREATE TABLE ticket_answers
DROP TABLE IF EXISTS public.ticket_answers CASCADE;
CREATE TABLE public.ticket_answers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    question_id uuid NOT NULL REFERENCES public.ai_diagnostic_questions(id),
    answer_value text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- 4. CREATE TABLE recommendation_rules
DROP TABLE IF EXISTS public.recommendation_rules CASCADE;
CREATE TABLE public.recommendation_rules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id uuid NOT NULL REFERENCES public.ai_diagnostic_categories(id),
    match_criteria jsonb NOT NULL,
    recommendation_text text NOT NULL,
    root_cause_text text,
    confidence_score integer DEFAULT 50,
    created_at timestamptz DEFAULT now()
);

-- 5. CREATE TABLE ticket_comments
DROP TABLE IF EXISTS public.ticket_comments CASCADE;
CREATE TABLE public.ticket_comments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    author_id uuid REFERENCES auth.users(id),
    comment_text text NOT NULL,
    is_system_generated boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);
