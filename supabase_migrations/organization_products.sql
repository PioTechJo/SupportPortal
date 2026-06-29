-- ==============================================================================
-- MULTI-TENANT SaaS LICENSED PRODUCTS MIGRATION
-- ==============================================================================

-- 1. Ensure core products exist in the `products` table
-- (This matches the new wizardConfig.json definitions)
INSERT INTO public.products (id, product_code, name, description)
VALUES 
  ('prod-goaml', 'GOAML', 'goAML', 'Anti-Money Laundering Compliance Engine'),
  ('prod-dwh', 'DWH', 'DWH', 'Data Warehouse & Analytics'),
  ('prod-ifrs9', 'IFRS9', 'IFRS9', 'Financial Instruments & ECL Calculation'),
  ('prod-ftp', 'FTP', 'FTP', 'Funds Transfer Pricing'),
  ('prod-regulatory', 'REGULATORY', 'Regulatory Reports', 'Central Bank Reporting Suite')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- 2. Create the organization_products table
CREATE TABLE IF NOT EXISTS public.organization_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    product_code TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure an organization can't have duplicate active product licenses
    UNIQUE(organization_id, product_code)
);

-- 3. Enable RLS
ALTER TABLE public.organization_products ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies
-- Read Policy: Any authenticated user can read organization products
CREATE POLICY "Enable read access for all authenticated users"
    ON public.organization_products FOR SELECT
    TO authenticated
    USING (true);

-- Insert/Update Policy: Admins/Service Roles can insert/update
CREATE POLICY "Enable write access for admins"
    ON public.organization_products FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM auth.users 
        WHERE auth.users.id = auth.uid() 
        AND (auth.users.raw_user_meta_data->>'role' IN ('administrator', 'admin', 'sys_admin'))
      )
    );

-- 5. Seed some initial data for demonstration purposes
-- Let's give all existing customers goAML and DWH to start, so they aren't empty.
INSERT INTO public.organization_products (organization_id, product_code, is_active)
SELECT id, 'prod-goaml', true FROM public.customers
ON CONFLICT DO NOTHING;

INSERT INTO public.organization_products (organization_id, product_code, is_active)
SELECT id, 'prod-dwh', true FROM public.customers
ON CONFLICT DO NOTHING;
