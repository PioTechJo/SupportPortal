import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { ticket_id } = await req.json()
    if (!ticket_id) {
      throw new Error('ticket_id is required')
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing Authorization header')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    // 1. Authenticated client (User scoped)
    // RLS naturally restricts data to the user's organization (or all if admin)
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    // 2. Service client (Bypasses RLS)
    // Used for backend administrative updates like status changes and recommendation inserts
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey)

    // A. Fetch Ticket details using the user client to ensure access
    const { data: ticket, error: ticketError } = await userClient
      .from('tickets')
      .select('id, product_id, category_id')
      .eq('id', ticket_id)
      .single()

    if (ticketError || !ticket) {
      throw new Error('Ticket not found or access denied')
    }

    // B. Duplicate Check (Using user client)
    // Query tickets where product_id and category_id match, status is not 'new'.
    // RLS automatically handles the requirement: "organization_id matches the current user's organization (or any if admin)"
    const { data: duplicates } = await userClient
      .from('tickets')
      .select('id')
      .eq('product_id', ticket.product_id)
      .eq('category_id', ticket.category_id)
      .neq('status', 'new')
      .neq('id', ticket.id)
      .order('created_at', { ascending: false })
      .limit(1)

    const duplicateOf = duplicates && duplicates.length > 0 ? duplicates[0].id : null

    // C. Fetch Submitted Answers
    const { data: answersData, error: answersError } = await serviceClient
      .from('ticket_answers')
      .select('question_id, answer_value')
      .eq('ticket_id', ticket_id)

    if (answersError) throw answersError

    // Map answers for easy lookup: { [question_id]: answer_value }
    const submittedAnswers = (answersData || []).reduce((acc, row) => {
      acc[row.question_id] = row.answer_value
      return acc
    }, {} as Record<string, string>)

    // D. Recommendation Rules Match
    const { data: rules, error: rulesError } = await serviceClient
      .from('recommendation_rules')
      .select('*')
      .eq('category_id', ticket.category_id)
      .order('confidence_score', { ascending: false })

    if (rulesError) throw rulesError

    let bestMatch = null
    for (const rule of (rules || [])) {
      const criteria = rule.match_criteria as Record<string, string>
      if (!criteria || Object.keys(criteria).length === 0) continue

      let isMatch = true
      // A rule matches if every key-value pair in match_criteria equals a submitted answer
      for (const [qId, expectedVal] of Object.entries(criteria)) {
        if (submittedAnswers[qId] !== expectedVal) {
          isMatch = false
          break
        }
      }

      if (isMatch) {
        bestMatch = rule
        break // Rules are already ordered by highest confidence_score
      }
    }

    // E. Write Recommendation
    const recPayload = bestMatch 
      ? {
          ticket_id,
          recommendation_text: bestMatch.recommendation_text,
          symptom_name: bestMatch.root_cause_text,
          confidence_score: bestMatch.confidence_score
        }
      : {
          ticket_id,
          recommendation_text: 'No automated recommendation found based on the provided answers.',
          confidence_score: 0
        }

    const { error: recError } = await serviceClient
      .from('ai_recommendations')
      .insert(recPayload)

    if (recError) throw recError

    // F. Update Ticket Status
    const updatePayload: Record<string, any> = { status: 'recommendation_shown' }
    if (duplicateOf) {
      updatePayload.duplicate_of = duplicateOf
    }

    const { error: updateError } = await serviceClient
      .from('tickets')
      .update(updatePayload)
      .eq('id', ticket_id)

    if (updateError) throw updateError

    return new Response(JSON.stringify({ success: true, duplicateOf, bestMatch }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
