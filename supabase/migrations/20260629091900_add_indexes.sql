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
