import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GENERIC_RESPONSE = JSON.stringify({
  success: true,
  message: "If an account exists for that email, a new password has been sent to it.",
});

function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => vars[key] ?? '');
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Always return the same generic response, even on internal errors, so this
  // public endpoint never reveals whether an email exists or what went wrong.
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return new Response(GENERIC_RESPONSE, { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const POWER_AUTOMATE_WEBHOOK_URL = Deno.env.get("POWER_AUTOMATE_EMAIL_WEBHOOK_URL");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !POWER_AUTOMATE_WEBHOOK_URL) {
      throw new Error("Server configuration is missing.");
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Look up the target user ourselves — never trust a client-supplied id
    // on this unauthenticated endpoint.
    const normalizedEmail = email.trim().toLowerCase();
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id, email, last_password_reset_requested_at")
      .ilike("email", normalizedEmail)
      .maybeSingle();

    if (!userRow) {
      return new Response(GENERIC_RESPONSE, { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 2. Basic throttle: at most one reset request per 2 minutes per account,
    // so this public endpoint can't be used to spam someone's inbox.
    if (userRow.last_password_reset_requested_at) {
      const lastRequest = new Date(userRow.last_password_reset_requested_at).getTime();
      if (Date.now() - lastRequest < 2 * 60 * 1000) {
        return new Response(GENERIC_RESPONSE, { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    await supabaseAdmin
      .from("users")
      .update({ last_password_reset_requested_at: new Date().toISOString() })
      .eq("id", userRow.id);

    // 3. Generate a fresh secure password and actually set it on the account
    const newPassword = crypto.randomUUID().replace(/-/g, "").substring(0, 16) + "A1!";
    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(userRow.id, {
      password: newPassword,
    });
    if (updateErr) throw updateErr;

    // 4. Render the same editable email template used by the admin-triggered flow
    const { data: template } = await supabaseAdmin
      .from("email_templates")
      .select("subject_template, body_template")
      .eq("trigger_key", "PASSWORD_RESET")
      .maybeSingle();

    const vars = { email: userRow.email, temp_password: newPassword };
    const subject = template
      ? fillTemplate(template.subject_template, vars)
      : "Your Support Portal password has been reset";
    const rawBody = template
      ? fillTemplate(template.body_template, vars)
      : `Hello,\n\nYour password has been reset.\n\nEmail: ${userRow.email}\nNew Password: ${newPassword}\n\nPlease log in and change your password.`;

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-bottom: 3px solid #3b82f6;">
          <h2 style="color: #1e293b; margin: 0;">Pio-Tech Support Portal</h2>
        </div>
        <div style="padding: 24px; line-height: 1.6; font-size: 15px;">
          ${rawBody.replace(/\n/g, "<br>")}
        </div>
        <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
          This is an automated notification from the Pio-Tech Support Portal.<br>
          Please do not reply directly to this email.
        </div>
      </div>
    `;

    let status = "sent";
    let errorMessage: string | null = null;
    try {
      const res = await fetch(POWER_AUTOMATE_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: userRow.email, subject, htmlBody }),
      });
      if (!res.ok) {
        status = "failed";
        errorMessage = `Power Automate webhook returned ${res.status}: ${await res.text()}`;
      }
    } catch (err: any) {
      status = "failed";
      errorMessage = err.message;
    }

    try {
      await supabaseAdmin.from("email_logs").insert({
        recipient_email: userRow.email,
        subject,
        status,
        error_message: errorMessage,
        related_ticket_id: null,
      });
    } catch (logErr) {
      console.error("Failed to log forgot-password email:", logErr);
    }

    return new Response(GENERIC_RESPONSE, { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("Forgot-password error:", err);
    return new Response(GENERIC_RESPONSE, { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
