
  SELECT u.email, u.id as user_id, c.customer_name 
  FROM users u 
  JOIN roles r ON u.role_id = r.id 
  JOIN customers c ON u.customer_id = c.id
  WHERE r.role_code = 'CLIENT' OR r.role_code = 'CUSTOMER' OR r.role_name ILIKE '%bank%'
  LIMIT 1;
