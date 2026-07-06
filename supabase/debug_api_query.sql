SELECT jsonb_agg(
  jsonb_build_object(
    'id', op.id,
    'product_code', op.product_code,
    'product', (
      SELECT jsonb_build_object(
        'id', p.id,
        'product_code', p.product_code,
        'product_name', p.product_name,
        'description', p.description,
        'icon', p.icon,
        'color', p.color,
        'display_order', p.display_order,
        'is_active', p.is_active
      )
      FROM products p WHERE p.id = op.product_id
    )
  )
)
FROM organization_products op
WHERE op.is_active = true;
