import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"

// Setup CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight options request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Ensure request matches acceptable methods
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  let body: any = null;
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.')
    }

    // Initialize Supabase Admin Client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Parse the payload
    body = await req.json()
    console.log("organization_id:", body.organization_id)
    console.log("productIds:", JSON.stringify(body.product_ids))
    const { organization_id, product_ids, performedBy } = body

    if (!organization_id || !Array.isArray(product_ids)) {
      throw new Error('Missing required fields: organization_id, product_ids')
    }

    // 1. Delete existing product assignments for the organization
    console.log("Executing DELETE for organization_id:", organization_id)
    const { error: deleteError } = await supabaseAdmin
      .from('organization_products')
      .delete()
      .eq('organization_id', organization_id)

    console.log("DELETE result:", JSON.stringify(deleteError ? deleteError : "SUCCESS"))

    if (deleteError) {
      throw new Error(`Delete Existing Products Error: ${JSON.stringify(deleteError)}`)
    }

    // Immediately query after DELETE
    const { data: afterDeleteData, error: afterDeleteError } = await supabaseAdmin
      .from('organization_products')
      .select('*')
      .eq('organization_id', organization_id)

    console.log("Rows remaining after DELETE:", JSON.stringify(afterDeleteData))
    if (afterDeleteError) {
      console.error("After-delete select error:", afterDeleteError)
    }

    // 2. Insert new product assignments
    if (product_ids.length > 0) {
      // Look up product_code for each UUID
      const { data: productsData, error: productsError } = await supabaseAdmin
        .from('products')
        .select('id, product_code')
        .in('id', product_ids)

      if (productsError) {
        throw new Error(`Failed to lookup product codes: ${JSON.stringify(productsError)}`)
      }

      if (!productsData || productsData.length === 0) {
        throw new Error(`No products found matching the provided UUIDs.`)
      }

      const payload = productsData.map((p: any) => ({
        organization_id,
        product_id: p.id,             // 001_add_product_uuid_columns Phase 1
        product_code: p.product_code, // Insert the actual text code (e.g. 'DWH') for zero-regression
        is_active: true
      }))
      
      console.log("INSERT payload:", JSON.stringify(payload))

      const { data: insertData, error: insertError } = await supabaseAdmin
        .from('organization_products')
        .insert(payload)
        .select() // Force returning data to verify insertion

      console.log("INSERT result:", JSON.stringify(insertError ? insertError : insertData))
      if (insertError) {
        throw new Error(`Insert New Products Error: ${JSON.stringify(insertError)}`)
      }
    } else {
      console.log("No product codes provided, skipping INSERT.")
    }

    // Immediately query after INSERT
    const { data: afterInsertData, error: afterInsertError } = await supabaseAdmin
      .from('organization_products')
      .select('*')
      .eq('organization_id', organization_id)

    console.log("Rows in DB after full operation:", JSON.stringify(afterInsertData))
    if (afterInsertError) {
      console.error("After-insert select error:", afterInsertError)
    }

    // 3. Write an audit log entry
    if (performedBy && performedBy.id) {
      await supabaseAdmin.from('audit_log').insert({
        action: 'UPDATE_ORGANIZATION_PRODUCTS',
        details: `Updated product licenses for organization ID ${organization_id}. Licensed products count: ${product_ids.length}`,
        performed_by_id: performedBy.id,
        performed_by_name: performedBy.name || 'Admin'
      })
    }

    // Return success
    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error: any) {
    console.error("Edge Function Caught Exception:", error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack,
        payload: body
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    )
  }
})
