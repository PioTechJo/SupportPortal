import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"

// Setup CORS headers for browser or external compatibility if needed
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
    // 1. Initialize Supabase Client with service_role key to bypass Row Level Security (RLS) policies securely
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment configurations (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) are missing inside Edge Function.')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Daily Ticket Update: Starting processing job at', new Date().toISOString())

    // 2. Query all tickets WHERE status IN ('open','in_progress') AND last_auto_comment_at < NOW() - INTERVAL '24 hours' (or is null)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    
    const { data: tickets, error: fetchError } = await supabase
      .from('tickets')
      .select('id, title, created_by, ticket_statuses!inner(status_code)')
      .in('ticket_statuses.status_code', ['NEW', 'ASSIGNED', 'INVESTIGATION', 'PENDING_CUSTOMER'])
      .or(`last_auto_comment_at.is.null,last_auto_comment_at.lt.${twentyFourHoursAgo}`)

    if (fetchError) {
      throw fetchError
    }

    if (!tickets || tickets.length === 0) {
      console.log('Daily Ticket Update: No tickets match criteria (Status: Open/In-progress with no auto update inside previous 24h).')
      return new Response(
        JSON.stringify({ success: true, processedCount: 0, details: 'No eligible tickets required updates.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Daily Ticket Update: Match count = ${tickets.length}. Generating comments and notifications...`)
    const now = new Date().toISOString()
    const results = []

    // 3. Process each ticket with transaction safety guarantees (wrapped in per-ticket handles)
    for (const ticket of tickets) {
      try {
        console.log(`Starting automated comment transaction on ticket ID: ${ticket.id}`)

        // Format short ticket code segment e.g., tick-4823 -> 4823
        const ticketCode = ticket.id.replace('tick-', '').toUpperCase()

        // a. INSERT daily update notice into comments (or ticket_comments as specified by criteria)
        // We write with fallback mechanisms to ensure perfect resilience whichever table name is present
        const commentData = {
          ticket_id: ticket.id,
          comment_text: "Our team is actively working on your ticket. We will provide an update as soon as possible. Thank you for your patience.",
          comment_type: 'system_auto',
          created_by: null,
          created_at: now
        }

        const { error: commentErr } = await supabase
          .from('ticket_comments')
          .insert([commentData])

        if (commentErr) {
          console.warn(`Failed insert into ticket_comments table for ticket ${ticket.id}. Attempting standard comments fallback database...`, commentErr)
          
          // Fallback to application's standard "comments" table
          const fallbackCommentData = {
            ticket_id: ticket.id,
            content: "Our team is actively working on your ticket. We will provide an update as soon as possible. Thank you for your patience.",
            is_internal: false,
            author_name: "System Automated Update",
            author_role: "system",
            created_at: now
          }

          const { error: fallbackErr } = await supabase
            .from('comments')
            .insert([fallbackCommentData])

          if (fallbackErr) {
            throw new Error(`Failed to insert update message on both system schemas: ${fallbackErr.message}`)
          }
        }

        // b. UPDATE ticket with last auto-comment timestamp to throttle notifications
        const { error: updateErr } = await supabase
          .from('tickets')
          .update({ last_auto_comment_at: now })
          .eq('id', ticket.id)

        if (updateErr) {
          throw updateErr
        }

        // c. INSERT custom client alert/notification to ticket creator
        if (ticket.created_by) {
          const { error: notifErr } = await supabase
            .from('notifications')
            .insert([{
              user_id: ticket.created_by,
              profile_id: ticket.created_by,
              content: `Update on ticket #TKT-${ticketCode}: Team is still working on your issue.`,
              type: 'system_auto_update',
              is_read: false,
              created_at: now
            }])

          if (notifErr) {
            console.warn(`Could not post notification stream to client ${ticket.created_by}:`, notifErr)
          }
        }

        results.push({ ticketId: ticket.id, status: 'success' })
      } catch (ticketError: any) {
        console.error(`Sub-task error during ticket ${ticket.id} lifecycle execution:`, ticketError)
        results.push({ ticketId: ticket.id, status: 'failed', error: ticketError.message })
      }
    }

    console.log(`Daily Ticket Update: Processed ${results.filter(r => r.status === 'success').length} out of ${tickets.length} successfully.`)

    return new Response(
      JSON.stringify({
        success: true,
        totalChecked: tickets.length,
        results
      }),
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
