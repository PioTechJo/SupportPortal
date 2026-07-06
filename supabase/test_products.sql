SELECT 
  op.*,
  p.id as product_id_joined,
  p.product_code as product_code_joined,
  p.product_name,
  p.description,
  p.icon,
  p.color,
  p.display_order,
  p.is_active as product_is_active
FROM organization_products op
LEFT JOIN products p ON op.product_id = p.id;
