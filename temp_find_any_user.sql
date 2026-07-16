
  SELECT u.email, r.role_code 
  FROM users u 
  JOIN roles r ON u.role_id = r.id;
