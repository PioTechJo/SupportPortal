INSERT INTO public.priorities (id, priority_code, priority_name, sort_order)
VALUES
  (gen_random_uuid(), 'LOW', 'Low', 10),
  (gen_random_uuid(), 'MEDIUM', 'Medium', 20),
  (gen_random_uuid(), 'HIGH', 'High', 30),
  (gen_random_uuid(), 'CRITICAL', 'Critical', 40),
  (gen_random_uuid(), 'URGENT', 'Urgent', 50);
