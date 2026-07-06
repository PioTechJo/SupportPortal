SELECT u.id, u.customer_id, r.role_name
FROM public.users u
JOIN public.roles r ON u.role_id = r.id
WHERE r.role_name != 'System Administrator'
AND u.id != 'e107f603-95e5-4eb0-8bee-ea224af6a41c'
LIMIT 1;
