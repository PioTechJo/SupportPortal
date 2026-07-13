-- Migration: Create email_logs table
CREATE TABLE IF NOT EXISTS public.email_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    recipient_email text NOT NULL,
    subject text NOT NULL,
    status text NOT NULL CHECK (status IN ('sent', 'failed')),
    error_message text,
    related_ticket_id uuid REFERENCES public.tickets(id) ON DELETE SET NULL,
    sent_at timestamptz DEFAULT now() NOT NULL
);

-- RLS
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Allow only admins to read email logs
CREATE POLICY "Admins can view email logs"
ON public.email_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role_code IN ('ADMIN', 'ADMINISTRATOR', 'CEO', 'SUPPORT_MANAGER', 'SYS_ADMIN')
  )
);

-- Allow service role to insert (edge functions use service role)
-- No explicit policy needed for service role if RLS is enabled, 
-- but it's good practice or just rely on service role bypassing RLS.
-- Since edge functions will use the service role key, they bypass RLS.

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON public.email_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_related_ticket_id ON public.email_logs(related_ticket_id);
