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
-- Migration: 004_add_indexes
-- Description: Adds non-blocking indexes only to existing tables and columns.

DO $$ 
BEGIN
    -- 1. TICKETS
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tickets') AND EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tickets' AND column_name = 'customer_id') THEN
        CREATE INDEX IF NOT EXISTS idx_tickets_customer_id ON public.tickets(customer_id);
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tickets') AND EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tickets' AND column_name = 'product_id') THEN
        CREATE INDEX IF NOT EXISTS idx_tickets_product_id ON public.tickets(product_id);
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tickets') AND EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tickets' AND column_name = 'status_id') THEN
        CREATE INDEX IF NOT EXISTS idx_tickets_status_id ON public.tickets(status_id);
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tickets') AND EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tickets' AND column_name = 'priority_id') THEN
        CREATE INDEX IF NOT EXISTS idx_tickets_priority_id ON public.tickets(priority_id);
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tickets') AND EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tickets' AND column_name = 'assigned_user_id') THEN
        CREATE INDEX IF NOT EXISTS idx_tickets_assigned_user_id ON public.tickets(assigned_user_id);
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tickets') AND EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tickets' AND column_name = 'assigned_team_id') THEN
        CREATE INDEX IF NOT EXISTS idx_tickets_assigned_team_id ON public.tickets(assigned_team_id);
    END IF;

    -- 2. USERS
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') AND EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'customer_id') THEN
        CREATE INDEX IF NOT EXISTS idx_users_customer_id ON public.users(customer_id);
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') AND EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'role_id') THEN
        CREATE INDEX IF NOT EXISTS idx_users_role_id ON public.users(role_id);
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') AND EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'team_id') THEN
        CREATE INDEX IF NOT EXISTS idx_users_team_id ON public.users(team_id);
    END IF;

    -- 3. ORGANIZATION_PRODUCTS
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organization_products') AND EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'organization_products' AND column_name = 'organization_id') THEN
        CREATE INDEX IF NOT EXISTS idx_organization_products_org_id ON public.organization_products(organization_id);
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organization_products') AND EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'organization_products' AND column_name = 'product_id') THEN
        CREATE INDEX IF NOT EXISTS idx_organization_products_product_id ON public.organization_products(product_id);
    END IF;

    -- 4. CUSTOMER_CONTACTS
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'customer_contacts') AND EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customer_contacts' AND column_name = 'customer_id') THEN
        CREATE INDEX IF NOT EXISTS idx_customer_contacts_customer_id ON public.customer_contacts(customer_id);
    END IF;

    -- 5. TEAM_MEMBERS
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'team_members') AND EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'team_members' AND column_name = 'user_id') THEN
        CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'team_members') AND EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'team_members' AND column_name = 'team_id') THEN
        CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members(team_id);
    END IF;
END $$;
DO $$
BEGIN
    -- Verify the table exists
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'organization_products'
    ) THEN

        -- Create SELECT policy
        IF NOT EXISTS (
            SELECT FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = 'organization_products' 
            AND policyname = 'Enable read access for authenticated users'
        ) THEN
            CREATE POLICY "Enable read access for authenticated users" 
            ON public.organization_products 
            FOR SELECT 
            TO authenticated 
            USING (true);
        END IF;

        -- Create INSERT policy
        IF NOT EXISTS (
            SELECT FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = 'organization_products' 
            AND policyname = 'Enable insert access for authenticated users'
        ) THEN
            CREATE POLICY "Enable insert access for authenticated users" 
            ON public.organization_products 
            FOR INSERT 
            TO authenticated 
            WITH CHECK (true);
        END IF;

        -- Create UPDATE policy
        IF NOT EXISTS (
            SELECT FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = 'organization_products' 
            AND policyname = 'Enable update access for authenticated users'
        ) THEN
            CREATE POLICY "Enable update access for authenticated users" 
            ON public.organization_products 
            FOR UPDATE 
            TO authenticated 
            USING (true) 
            WITH CHECK (true);
        END IF;

        -- Create DELETE policy
        IF NOT EXISTS (
            SELECT FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = 'organization_products' 
            AND policyname = 'Enable delete access for authenticated users'
        ) THEN
            CREATE POLICY "Enable delete access for authenticated users" 
            ON public.organization_products 
            FOR DELETE 
            TO authenticated 
            USING (true);
        END IF;

    END IF;
END $$;
DO $$
BEGIN
    -- Verify the table exists
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'products'
    ) THEN
        -- Create SELECT policy for authenticated users
        IF NOT EXISTS (
            SELECT FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = 'products' 
            AND policyname = 'Enable read access for authenticated users on products'
        ) THEN
            CREATE POLICY "Enable read access for authenticated users on products" 
            ON public.products 
            FOR SELECT 
            TO authenticated 
            USING (true);
        END IF;
    END IF;
END $$;
-- Seed the priorities table because it was completely empty in the production database
INSERT INTO public.priorities (id, priority_code, priority_name, sort_order)
VALUES 
  (gen_random_uuid(), 'LOW', 'Low', 4),
  (gen_random_uuid(), 'MEDIUM', 'Medium', 3),
  (gen_random_uuid(), 'HIGH', 'High', 2),
  (gen_random_uuid(), 'URGENT', 'Urgent', 1)
ON CONFLICT (priority_code) DO NOTHING;
-- Fix RLS for lookup tables so the authenticated role can query them
-- ticket_statuses
CREATE POLICY "Enable read access for authenticated users" ON public.ticket_statuses
FOR SELECT TO authenticated USING (true);

-- priorities
CREATE POLICY "Enable read access for authenticated users" ON public.priorities
FOR SELECT TO authenticated USING (true);
-- Ensure administrators and support staff can see all tickets
DROP POLICY IF EXISTS "Tickets read admin" ON public.tickets;
CREATE POLICY "Tickets read admin" ON public.tickets
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.roles r ON u.role_id = r.id
    WHERE u.id = auth.uid()
    AND UPPER(r.role_name) IN ('ADMIN', 'ADMINISTRATOR', 'SYS_ADMIN', 'SUPPORT_MANAGER', 'SUPPORT_ENGINEER', 'TEAM_LEAD')
  )
);

-- Ensure customers can still see their own tickets
DROP POLICY IF EXISTS "Tickets read customer" ON public.tickets;
CREATE POLICY "Tickets read customer" ON public.tickets
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()
    AND u.customer_id = tickets.customer_id
  )
  OR created_by = auth.uid()
);
-- Security Definer function to bypass RLS on the users and roles table
CREATE OR REPLACE FUNCTION public.auth_user_role_name()
RETURNS text
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.role_name
  FROM public.users u
  JOIN public.roles r ON u.role_id = r.id
  WHERE u.id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.auth_user_customer_id()
RETURNS uuid
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT customer_id
  FROM public.users
  WHERE id = auth.uid()
  LIMIT 1;
$$;

DROP POLICY IF EXISTS "Tickets read admin" ON public.tickets;
CREATE POLICY "Tickets read admin" ON public.tickets
FOR SELECT TO authenticated USING (
  UPPER(auth_user_role_name()) IN ('ADMIN', 'ADMINISTRATOR', 'SYS_ADMIN', 'SUPPORT_MANAGER', 'SUPPORT_ENGINEER', 'TEAM_LEAD')
);

DROP POLICY IF EXISTS "Tickets read customer" ON public.tickets;
CREATE POLICY "Tickets read customer" ON public.tickets
FOR SELECT TO authenticated USING (
  customer_id = auth_user_customer_id()
  OR created_by = auth.uid()
);
-- Drop the existing policy
DROP POLICY IF EXISTS "Tickets read admin" ON public.tickets;

-- Recreate it with the added 'SYSTEM ADMINISTRATOR' role
CREATE POLICY "Tickets read admin" ON public.tickets
FOR SELECT TO authenticated USING (
  UPPER(auth_user_role_name()) IN ('ADMIN', 'ADMINISTRATOR', 'SYS_ADMIN', 'SYSTEM ADMINISTRATOR', 'SUPPORT_MANAGER', 'SUPPORT_ENGINEER', 'TEAM_LEAD')
);
-- Add UI properties to the products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS icon TEXT,
ADD COLUMN IF NOT EXISTS color TEXT,
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 999,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Backfill data for legacy products to match the old UI experience
UPDATE public.products SET description = 'Anti-Money Laundering Compliance Engine', display_order = 10, is_active = true WHERE product_code = 'goaml';
UPDATE public.products SET description = 'Data Warehouse & Analytics', display_order = 20, is_active = true WHERE product_code = 'dwh';
UPDATE public.products SET description = 'Financial Instruments & ECL Calculation', display_order = 30, is_active = true WHERE product_code = 'ifrs9';
UPDATE public.products SET description = 'Funds Transfer Pricing', display_order = 40, is_active = true WHERE product_code = 'ftp';
UPDATE public.products SET description = 'Central Bank Reporting Suite', display_order = 50, is_active = true WHERE product_code = 'regulatory';
INSERT INTO public.priorities (id, priority_code, priority_name, sort_order)
VALUES
  (gen_random_uuid(), 'LOW', 'Low', 10),
  (gen_random_uuid(), 'MEDIUM', 'Medium', 20),
  (gen_random_uuid(), 'HIGH', 'High', 30),
  (gen_random_uuid(), 'CRITICAL', 'Critical', 40),
  (gen_random_uuid(), 'URGENT', 'Urgent', 50);
