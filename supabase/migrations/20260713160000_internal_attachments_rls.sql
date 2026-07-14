-- Ensure is_internal exists (failsafe)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ticket_attachments' AND column_name = 'is_internal') THEN
        ALTER TABLE ticket_attachments ADD COLUMN is_internal BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Drop existing restrictive policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Restrict internal attachments from clients" ON ticket_attachments;

-- Restrict internal attachments from clients
-- This is a RESTRICTIVE policy, meaning it filters rows regardless of permissive policies
CREATE POLICY "Restrict internal attachments from clients"
ON ticket_attachments
AS RESTRICTIVE
FOR SELECT
USING (
  (is_internal = false) OR 
  EXISTS (
    SELECT 1 FROM users u
    JOIN customers c ON c.id = u.customer_id
    WHERE u.id = auth.uid() 
    AND c.is_internal = true
  )
);
