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
