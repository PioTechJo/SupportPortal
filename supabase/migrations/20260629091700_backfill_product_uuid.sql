-- Migration: 002_backfill_product_uuid
-- Description: Backfills the product_id (UUID) column securely from the existing product_code.

DO $$ 
BEGIN
    -- 1. organization_products backfill
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'organization_products' 
        AND column_name = 'product_id'
    ) THEN
        UPDATE public.organization_products op
        SET product_id = p.id
        FROM public.products p
        WHERE op.product_code = p.product_code 
        AND op.product_id IS NULL;
    END IF;

    -- 2. knowledge_articles backfill
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'knowledge_articles' 
        AND column_name = 'product_id'
    ) THEN
        UPDATE public.knowledge_articles ka
        SET product_id = p.id
        FROM public.products p
        WHERE ka.product_code = p.product_code 
        AND ka.product_id IS NULL;
    END IF;
END $$;
