import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// TODO: Implement actual email/push notifications (step j)
// We need to decide on a notification provider (e.g., SendGrid, Postmark, Firebase) before building this out.
async function sendNotification(ticketId: string, message: string) {
  // Stub for notification provider logic
  console.log(`[STUB NOTIFICATION] Ticket ${ticketId}: ${message}`)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    // Use service client because this is an automated system task bypassing RLS
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey)

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    // 1. Find tickets in progress where last_progress_comment_at is null OR > 24h ago
    const { data: tickets, error: fetchError } = await serviceClient
      .from('tickets')
      .select('id, last_progress_comment_at')
      .eq('status', 'in_progress')
      .or(`last_progress_comment_at.is.null,last_progress_comment_at.lte.${twentyFourHoursAgo}`)

    if (fetchError) throw fetchError

    if (!tickets || tickets.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No tickets require auto-commenting.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let processedCount = 0

    for (const ticket of tickets) {
      const commentText = "The team is still working on this ticket and will get back to you soon."

      // 2. Insert system-generated comment
      // We leave 'comment_by' null (if schema allows) or assign a specific system UUID.
      // Assuming 'comment_by' can be null for system comments. If not, we would need a dedicated system user.
      const { error: commentError } = await serviceClient
        .from('ticket_comments')
        .insert({
          ticket_id: ticket.id,
          comment_text: commentText,
          // comment_by: null // System generated
        })

      if (commentError) {
        console.error(`Failed to insert comment for ticket ${ticket.id}:`, commentError)
        continue
      }

      // 3. Update last_progress_comment_at
      const { error: updateError } = await serviceClient
        .from('tickets')
        .update({ last_progress_comment_at: new Date().toISOString() })
        .eq('id', ticket.id)

      if (updateError) {
        console.error(`Failed to update last_progress_comment_at for ticket ${ticket.id}:`, updateError)
        continue
      }

      // 4. Trigger stubbed notification
      await sendNotification(ticket.id, commentText)
      processedCount++
    }

    return new Response(JSON.stringify({ success: true, processedCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
