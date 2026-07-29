import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => vars[key] ?? '');
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId, email } = await req.json();
    if (!userId || !email) {
      throw new Error("Missing required parameters: userId, email");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const POWER_AUTOMATE_WEBHOOK_URL = Deno.env.get("POWER_AUTOMATE_EMAIL_WEBHOOK_URL");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase environment configuration is missing.");
    }
    if (!POWER_AUTOMATE_WEBHOOK_URL) {
      throw new Error("POWER_AUTOMATE_EMAIL_WEBHOOK_URL is not configured");
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Generate a fresh secure password and actually set it on the account
    // (not just display one — this is the same real update the "invite user"
    // flow already does, just applied to an existing account).
    const newPassword = crypto.randomUUID().replace(/-/g, "").substring(0, 16) + "A1!";

    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });
    if (updateErr) throw updateErr;

    // 2. Render the editable email template
    const { data: template } = await supabaseAdmin
      .from("email_templates")
      .select("subject_template, body_template")
      .eq("trigger_key", "PASSWORD_RESET")
      .maybeSingle();

    const vars = { email, temp_password: newPassword };
    const subject = template
      ? fillTemplate(template.subject_template, vars)
      : "Your Support Portal password has been reset";
    const rawBody = template
      ? fillTemplate(template.body_template, vars)
      : `Hello,\n\nYour password has been reset.\n\nEmail: ${email}\nNew Password: ${newPassword}\n\nPlease log in and change your password.`;

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

    // 3. Send via the same Power Automate pipeline as the other notifications
    let status = "sent";
    let errorMessage: string | null = null;
    try {
      const res = await fetch(POWER_AUTOMATE_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: email, subject, htmlBody }),
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
        recipient_email: email,
        subject,
        status,
        error_message: errorMessage,
        related_ticket_id: null,
      });
    } catch (logErr) {
      console.error("Failed to log password reset email:", logErr);
    }

    if (status === "failed") {
      // The password WAS already changed on the account even though the email failed to
      // send — surface that clearly so the admin doesn't assume nothing happened.
      return new Response(
        JSON.stringify({ error: `Password was reset, but the email failed to send: ${errorMessage}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Password reset error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
