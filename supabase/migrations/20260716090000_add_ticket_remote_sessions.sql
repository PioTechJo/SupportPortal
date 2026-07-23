-- Migration: Let the assigned engineer request a remote check-in on a
-- ticket (a meeting link the bank can join), and notify the bank about it.

CREATE TABLE IF NOT EXISTS public.ticket_remote_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    requested_by uuid REFERENCES auth.users(id),
    meeting_url text NOT NULL,
    message text,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_remote_sessions_ticket_id ON public.ticket_remote_sessions(ticket_id);

ALTER TABLE public.ticket_remote_sessions ENABLE ROW LEVEL SECURITY;

-- Anyone who can see the parent ticket can see its remote session requests
-- (tickets' own RLS restricts which tickets are visible to this user).
DROP POLICY IF EXISTS "View remote sessions for accessible tickets" ON public.ticket_remote_sessions;
CREATE POLICY "View remote sessions for accessible tickets"
ON public.ticket_remote_sessions
FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_remote_sessions.ticket_id)
);

-- Only the assigned engineer (or internal admin/manager roles) can create a request
DROP POLICY IF EXISTS "Assigned engineer can request remote session" ON public.ticket_remote_sessions;
CREATE POLICY "Assigned engineer can request remote session"
ON public.ticket_remote_sessions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_remote_sessions.ticket_id
      AND (
        t.assigned_to = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.users u
          JOIN public.roles r ON r.id = u.role_id
          WHERE u.id = auth.uid()
            AND UPPER(r.role_code) IN ('ADMIN', 'ADMINISTRATOR', 'SYS_ADMIN', 'SUPPORT_MANAGER', 'CEO')
        )
      )
  )
);

-- The requester (engineer) or internal admins/managers can update status (e.g. mark completed/cancelled)
DROP POLICY IF EXISTS "Requester or admin can update remote session" ON public.ticket_remote_sessions;
CREATE POLICY "Requester or admin can update remote session"
ON public.ticket_remote_sessions
FOR UPDATE
USING (
  requested_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    WHERE u.id = auth.uid()
      AND UPPER(r.role_code) IN ('ADMIN', 'ADMINISTRATOR', 'SYS_ADMIN', 'SUPPORT_MANAGER', 'CEO')
  )
);
