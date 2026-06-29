-- Migration: 003_add_foreign_keys
-- Description: Adds foreign key constraints to the product_id column safely.

DO $$ 
DECLARE
    orphan_count integer;
BEGIN
    -- 1. organization_products
    IF EXISTS (
        SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products'
    ) AND EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'organization_products' 
        AND column_name = 'product_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_org_prod_product_id'
    ) THEN
        -- Verify no orphans exist before applying constraint
        SELECT count(*) INTO orphan_count
        FROM public.organization_products op
        WHERE op.product_id IS NOT NULL 
        AND NOT EXISTS (SELECT 1 FROM public.products p WHERE p.id = op.product_id);

        IF orphan_count = 0 THEN
            ALTER TABLE public.organization_products
            ADD CONSTRAINT fk_org_prod_product_id 
            FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;
        ELSE
            RAISE NOTICE 'Skipping fk_org_prod_product_id: % orphan records found.', orphan_count;
        END IF;
    END IF;

    -- 2. knowledge_articles
    IF EXISTS (
        SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products'
    ) AND EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'knowledge_articles' 
        AND column_name = 'product_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_kb_product_id'
    ) THEN
        -- Verify no orphans exist before applying constraint
        SELECT count(*) INTO orphan_count
        FROM public.knowledge_articles ka
        WHERE ka.product_id IS NOT NULL 
        AND NOT EXISTS (SELECT 1 FROM public.products p WHERE p.id = ka.product_id);

        IF orphan_count = 0 THEN
            ALTER TABLE public.knowledge_articles
            ADD CONSTRAINT fk_kb_product_id 
            FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;
        ELSE
            RAISE NOTICE 'Skipping fk_kb_product_id: % orphan records found.', orphan_count;
        END IF;
    END IF;
END $$;
