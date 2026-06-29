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
    const { email, name, role, customer_id, createdBy } = await req.json()

    if (!email || !name || !role) {
      throw new Error('Missing required fields: email, name, role')
    }

    // 1. Map legacy UI role to DB role string
    let dbRoleName = role.toUpperCase()
    if (dbRoleName === 'ADMINISTRATOR') dbRoleName = 'ADMIN'
    if (dbRoleName === 'AGENT') dbRoleName = 'SUPPORT_ENGINEER'
    if (dbRoleName === 'CLIENT' || dbRoleName === 'CAB_USER') dbRoleName = 'BANK_USER'

    // 2. Query roles table to get role_id using role_code
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('roles')
      .select('id')
      .eq('role_code', dbRoleName)
      .maybeSingle()

    if (roleError || !roleData) {
      throw new Error(`Failed to resolve role: ${dbRoleName}`)
    }
    const roleId = roleData.id

    console.error("SERVICE_ROLE_KEY_EXISTS:", !!supabaseServiceKey)
    console.error("SUPABASE_URL:", supabaseUrl)

    // 3. Create the user in Auth directly
    const generatedPassword = crypto.randomUUID().replace(/-/g, '') + 'A1!';
    let authData;
    let authError;
    try {
      const result = await supabaseAdmin.auth.admin.createUser({
        email,
        password: generatedPassword,
        email_confirm: true,
        user_metadata: {
          name,
          role: dbRoleName,
          customer_id
        }
      })
      authData = result.data
      authError = result.error
    } catch (error: any) {
      console.error("CREATE_USER_EXCEPTION:", {
        error,
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
        json: JSON.stringify(error, Object.getOwnPropertyNames(error))
      })
      throw error;
    }

    if (authError || !authData?.user) {
      return new Response(
        JSON.stringify(
          {
            success: false,
            authError,
            authData
          },
          null,
          2
        ),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      )
    }

    const authUserId = authData.user.id

    // 4. Insert the new user into public.users using Service Role (bypassing RLS)
    const insertPayload = {
      id: authUserId,
      email,
      full_name: name,
      role_id: roleId,
      customer_id: customer_id || null,
      created_at: new Date().toISOString()
    }

    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .insert(insertPayload)
      .select()
      .single()

    if (userError) {
      // In a robust system, we might delete the auth user here if profile creation fails
      // await supabaseAdmin.auth.admin.deleteUser(authUserId)
      throw new Error(`Profile Insert Error: ${userError.message}`)
    }

    // 5. Audit Log (Optional but requested)
    if (createdBy) {
      await supabaseAdmin.from('audit_log').insert({
        action: 'INVITE_USER',
        target_user_id: authUserId,
        target_user_email: email,
        details: `Invited new user '${name}' with role '${dbRoleName}'`,
        performed_by_id: createdBy.id,
        performed_by_name: createdBy.name
      })
    }

    // Return success
    return new Response(
      JSON.stringify({ 
        success: true, 
        email,
        temporaryPassword: generatedPassword,
        profile: userProfile 
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
