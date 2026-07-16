
  -- Simulate Admin Login
  SET ROLE authenticated;
  SET request.jwt.claims = '{"email": "admin@pio-tech.com", "role": "authenticated", "sub": "8066aa61-7985-4be8-92cc-490b0d3f4b95"}';
  
  -- Call RPC
  SELECT get_dashboard_analytics('2020-01-01', '2026-12-31');
