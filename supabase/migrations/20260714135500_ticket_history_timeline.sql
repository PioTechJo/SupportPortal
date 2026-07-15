-- 1. Create the ticket_history table
CREATE TABLE ticket_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'created', 'assigned', 'status_changed', 'escalated', 'returned'
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security
ALTER TABLE ticket_history ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policy: View history for accessible tickets, hiding internal events from clients
CREATE POLICY "Users can view history of their accessible tickets"
ON ticket_history
FOR SELECT
USING (
    -- User must be able to see the ticket this event belongs to
    EXISTS (
        SELECT 1 FROM tickets t WHERE t.id = ticket_history.ticket_id
    )
    AND (
        -- If it's an internal event, ensure the user belongs to an internal organization
        (event_type NOT IN ('escalated', 'returned'))
        OR
        EXISTS (
            SELECT 1 FROM users u
            JOIN customers c ON u.customer_id = c.id
            WHERE u.id = auth.uid() AND c.is_internal = true
        )
    )
);

-- 4. Trigger Function for `tickets` table (Created, Assigned, Status Changed)
CREATE OR REPLACE FUNCTION log_ticket_history()
RETURNS TRIGGER AS $$
DECLARE
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();
    
    IF TG_OP = 'INSERT' THEN
        INSERT INTO ticket_history (ticket_id, event_type, actor_id, note)
        VALUES (NEW.id, 'created', current_user_id, 'Ticket created');
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- Status Changed
        IF OLD.status_code IS DISTINCT FROM NEW.status_code THEN
            INSERT INTO ticket_history (ticket_id, event_type, actor_id, note)
            VALUES (NEW.id, 'status_changed', current_user_id, NEW.status_code);
        END IF;

        -- Assigned To Changed
        IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to AND NEW.assigned_to IS NOT NULL THEN
            INSERT INTO ticket_history (ticket_id, event_type, actor_id, note)
            VALUES (NEW.id, 'assigned', current_user_id, NEW.assigned_to::text);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_log_ticket_history
AFTER INSERT OR UPDATE ON tickets
FOR EACH ROW
EXECUTE FUNCTION log_ticket_history();


-- 5. Trigger Function for `ticket_comments` table (Escalated, Returned)
CREATE OR REPLACE FUNCTION log_ticket_comment_history()
RETURNS TRIGGER AS $$
DECLARE
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();
    
    IF TG_OP = 'INSERT' THEN
        IF NEW.escalated_team_id IS NOT NULL THEN
            INSERT INTO ticket_history (ticket_id, event_type, actor_id, note)
            VALUES (NEW.ticket_id, 'escalated', current_user_id, NEW.escalated_team_id::text);
        END IF;
        
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.escalation_returned_at IS NULL AND NEW.escalation_returned_at IS NOT NULL THEN
            INSERT INTO ticket_history (ticket_id, event_type, actor_id, note)
            VALUES (NEW.ticket_id, 'returned', current_user_id, 'Escalation returned');
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_log_ticket_comment_history
AFTER INSERT OR UPDATE ON ticket_comments
FOR EACH ROW
EXECUTE FUNCTION log_ticket_comment_history();
