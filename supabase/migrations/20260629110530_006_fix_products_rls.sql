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
