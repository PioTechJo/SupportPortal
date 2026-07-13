import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { to, subject, body, ticket_id } = await req.json();

    if (!to || !subject || !body) {
      throw new Error("Missing required parameters: to, subject, body");
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-bottom: 3px solid #3b82f6;">
          <h2 style="color: #1e293b; margin: 0;">Pio-Tech Support Portal</h2>
        </div>
        <div style="padding: 24px; line-height: 1.6; font-size: 15px;">
          ${body.replace(/\n/g, '<br>')}
        </div>
        <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
          This is an automated notification from the Pio-Tech Support Portal.<br>
          Please do not reply directly to this email.
        </div>
      </div>
    `;

    let emailStatus = 'sent';
    let errorMessage = null;
    let data;

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${RESEND_API_KEY}`
        },
        body: JSON.stringify({
          from: "support@pio-tech.com",
          to: to,
          subject: subject,
          html: htmlBody
        })
      });

      data = await res.json();

      if (!res.ok) {
        emailStatus = 'failed';
        errorMessage = data.message || JSON.stringify(data);
      }
    } catch (err: any) {
      emailStatus = 'failed';
      errorMessage = err.message;
    }

    // Try logging to database
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await supabase.from('email_logs').insert({
          recipient_email: to,
          subject: subject,
          status: emailStatus,
          error_message: errorMessage,
          related_ticket_id: ticket_id || null
        });
      } catch (logErr) {
        console.error("Failed to log email to database:", logErr);
      }
    }

    if (emailStatus === 'failed') {
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, message: "Email sent successfully via Resend", data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Email sending error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
