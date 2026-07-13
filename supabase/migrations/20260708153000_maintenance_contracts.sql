CREATE TABLE IF NOT EXISTS maintenance_contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    fiscal_year INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

ALTER TABLE maintenance_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin has full access to maintenance_contracts"
    ON maintenance_contracts
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            JOIN roles ON users.role_id = roles.id
            WHERE users.id = auth.uid()
            AND roles.role_code IN ('ADMIN', 'ADMINISTRATOR', 'CEO', 'SUPPORT_MANAGER')
        )
    );
