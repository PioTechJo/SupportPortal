-- Migration: 001_add_product_uuid_columns
-- Description: Adds product_id (UUID) to tables securely.

DO $$ 
BEGIN
    -- 1. organization_products
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'organization_products'
    ) THEN
        ALTER TABLE public.organization_products 
        ADD COLUMN IF NOT EXISTS product_id UUID;
    END IF;

    -- 2. knowledge_articles
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'knowledge_articles'
    ) THEN
        ALTER TABLE public.knowledge_articles 
        ADD COLUMN IF NOT EXISTS product_id UUID;
    END IF;
END $$;
