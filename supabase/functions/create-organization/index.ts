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
    const { name, domain, createdBy } = await req.json()

    if (!name || !domain) {
      throw new Error('Missing required fields: name, domain')
    }

    // 1. Insert the new organization into public.customers using Service Role (bypassing RLS)
    const insertPayload = {
      customer_code: domain.replace('.com', '').toUpperCase(),
      customer_name: name,
      status: 'ACTIVE'
    }

    const { data: customerData, error: customerError } = await supabaseAdmin
      .from('customers')
      .insert(insertPayload)
      .select()
      .single()

    if (customerError) {
      throw new Error(`Customer Insert Error: ${customerError.message}`)
    }

    // 2. Audit Log
    if (createdBy && createdBy.id) {
      await supabaseAdmin.from('audit_log').insert({
        action: 'CREATE_TENANT',
        details: `Registered customer organization '${name}' with domain '${domain}'`,
        performed_by_id: createdBy.id,
        performed_by_name: createdBy.name || 'Admin'
      })
    }

    // Return success
    return new Response(
      JSON.stringify({ 
        success: true, 
        customer: customerData 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error: any) {
    console.error("Edge Function Error:", error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal Server Error' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
