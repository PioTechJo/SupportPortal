-- Migration: 013_drop_unused_tables
-- Description: Drops tables that are no longer referenced in the application code.

DROP TABLE IF EXISTS public.ai_products CASCADE;
DROP TABLE IF EXISTS public.ai_symptoms CASCADE;
DROP TABLE IF EXISTS public.ai_question_templates CASCADE;
DROP TABLE IF EXISTS public.knowledge_articles CASCADE;
DROP TABLE IF EXISTS public.ai_knowledge_articles CASCADE;
