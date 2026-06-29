-- Seed the priorities table because it was completely empty in the production database
INSERT INTO public.priorities (id, priority_code, priority_name, sort_order)
VALUES 
  (gen_random_uuid(), 'LOW', 'Low', 4),
  (gen_random_uuid(), 'MEDIUM', 'Medium', 3),
  (gen_random_uuid(), 'HIGH', 'High', 2),
  (gen_random_uuid(), 'URGENT', 'Urgent', 1)
ON CONFLICT (priority_code) DO NOTHING;
