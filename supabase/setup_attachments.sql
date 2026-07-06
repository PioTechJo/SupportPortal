-- Create ticket_attachments table
CREATE TABLE IF NOT EXISTS ticket_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  uploaded_by uuid REFERENCES auth.users(id),
  file_name text NOT NULL,
  file_size integer,
  file_type text,
  storage_path text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- RLS Policies for ticket_attachments
ALTER TABLE ticket_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read ticket_attachments"
ON public.ticket_attachments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert ticket_attachments"
ON public.ticket_attachments FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete own attachments"
ON public.ticket_attachments FOR DELETE TO authenticated 
USING (uploaded_by = auth.uid());

-- Fix for ticket_comments INSERT
CREATE POLICY "Allow authenticated users to insert ticket_comments"
ON public.ticket_comments
FOR INSERT TO authenticated
WITH CHECK (true);
