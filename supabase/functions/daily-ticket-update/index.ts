import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"

// Setup CORS headers for browser or external compatibility if needed
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const AUTO_COMMENT_TEXT = "The Pio-Tech team is currently investigating your ticket and will get back to you with an update as soon as possible."

Deno.serve(async (req) => {
  // Handle CORS preflight options request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Ensure request matches acceptable methods for scheduling and triggers
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment configurations (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) are missing inside Edge Function.')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 0. Admin on/off switch
    const { data: toggleSetting } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'auto_comment_enabled')
      .maybeSingle()

    if (toggleSetting?.setting_value === 'false') {
      return new Response(
        JSON.stringify({ success: true, message: 'Auto-comment is disabled by admin, nothing to do.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Daily Ticket Update: Starting processing job at', new Date().toISOString())

    // 1. Tickets that are still open/in-progress and haven't had a support update in 24h
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data: tickets, error: fetchError } = await supabase
      .from('tickets')
      .select('id, created_by, last_progress_comment_at, ticket_statuses!inner(status_code)')
      .in('ticket_statuses.status_code', ['NEW', 'ASSIGNED', 'INVESTIGATION', 'DEVELOPMENT_ACTION', 'PENDING_CUSTOMER'])
      .or(`last_progress_comment_at.is.null,last_progress_comment_at.lt.${twentyFourHoursAgo}`)

    if (fetchError) {
      throw fetchError
    }

    if (!tickets || tickets.length === 0) {
      console.log('Daily Ticket Update: No tickets match criteria.')
      return new Response(
        JSON.stringify({ success: true, processedCount: 0, details: 'No eligible tickets required updates.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Daily Ticket Update: Match count = ${tickets.length}. Generating comments and notifications...`)
    const now = new Date().toISOString()
    const results = []

    for (const ticket of tickets) {
      try {
        // a. Post the auto-comment on the ticket timeline
        const { error: commentErr } = await supabase
          .from('ticket_comments')
          .insert({
            ticket_id: ticket.id,
            author_id: null,
            comment_text: AUTO_COMMENT_TEXT,
            is_system_generated: true,
          })

        if (commentErr) {
          throw commentErr
        }

        // b. Update last_progress_comment_at to throttle future runs
        const { error: updateErr } = await supabase
          .from('tickets')
          .update({ last_progress_comment_at: now })
          .eq('id', ticket.id)

        if (updateErr) {
          throw updateErr
        }

        // c. Notify the customer who filed the ticket
        if (ticket.created_by) {
          const { error: notifErr } = await supabase
            .from('notifications')
            .insert({
              profile_id: ticket.created_by,
              content: 'The support team posted an update on your ticket.',
              type: 'system_auto_update',
              is_read: false,
              link_ticket_id: ticket.id,
              created_at: now,
            })

          if (notifErr) {
            console.warn(`Could not post notification to client ${ticket.created_by}:`, notifErr)
          }
        }

        results.push({ ticketId: ticket.id, status: 'success' })
      } catch (ticketError: any) {
        console.error(`Error processing ticket ${ticket.id}:`, ticketError)
        results.push({ ticketId: ticket.id, status: 'failed', error: ticketError.message })
      }
    }

    console.log(`Daily Ticket Update: Processed ${results.filter(r => r.status === 'success').length} out of ${tickets.length} successfully.`)

    return new Response(
      JSON.stringify({ success: true, totalChecked: tickets.length, results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error('Fatal runtime failure within daily-ticket-update function:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
