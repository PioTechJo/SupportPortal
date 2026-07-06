SELECT r.role_name 
FROM public.users u 
JOIN public.roles r ON u.role_id = r.id 
WHERE u.id = '8066aa61-7985-4be8-92cc-490b0d3f4b95';
