SELECT 
  count(*) as total_org_products,
  count(product_id) as products_with_uuid,
  count(product_code) as products_with_code
FROM organization_products;

SELECT op.*, p.id as p_id, p.description
FROM organization_products op
LEFT JOIN products p ON op.product_id = p.id
LIMIT 5;
