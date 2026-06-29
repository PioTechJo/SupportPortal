-- Clear out the broken text-based relations
TRUNCATE TABLE public.organization_products;

-- Drop the old text column
ALTER TABLE public.organization_products DROP COLUMN product_code;

-- Add the new canonical UUID column with a Foreign Key constraint
ALTER TABLE public.organization_products 
  ADD COLUMN product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE;

-- Add the unique constraint to prevent duplicates
ALTER TABLE public.organization_products 
  ADD CONSTRAINT unique_org_product UNIQUE (organization_id, product_id);
