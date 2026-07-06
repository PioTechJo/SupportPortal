-- Add manager_id to users table to support the resolution approval workflow
ALTER TABLE public.users ADD COLUMN manager_id uuid REFERENCES public.users(id);
