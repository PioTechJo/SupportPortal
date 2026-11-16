import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { sendEmail } from "../_shared/graph-mail.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_ROLES = ["ADMIN", "ADMINISTRATOR", "SYS_ADMIN", "CEO", "SUPPORT_MANAGER"];
const EMAIL_RE = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/;
const MAX_RECIPIENTS = 20;

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SERVICE_KEY) throw new Error("Supabase environment configuration is missing.");

    // Only admin-type staff may send reports to arbitrary addresses.
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Not authenticated." }, 401);

    const { data: profile } = await admin
      .from("users")
      .select("roles!users_role_id_fkey(role_code)")
      .eq("id", userData.user.id)
      .maybeSingle();
    const roleCode = String((profile as any)?.roles?.role_code ?? "").toUpperCase();
    if (!ALLOWED_ROLES.includes(roleCode)) return json({ error: "Not allowed to send reports." }, 403);

    const { recipients, subject, message, attachment } = await req.json();

    const list: string[] = Array.from(
      new Set((Array.isArray(recipients) ? recipients : []).map((e: any) => String(e).trim().toLowerCase()).filter(Boolean)),
    );
    if (list.length === 0) return json({ error: "At least one recipient is required." }, 400);
    if (list.length > MAX_RECIPIENTS) return json({ error: `At most ${MAX_RECIPIENTS} recipients are allowed.` }, 400);
    const invalid = list.filter((e) => !EMAIL_RE.test(e));
    if (invalid.length > 0) return json({ error: `Invalid email address: ${invalid.join(", ")}` }, 400);
    if (!subject || typeof subject !== "string") return json({ error: "Subject is required." }, 400);
    if (!attachment?.name || !attachment?.contentBytes) return json({ error: "The report attachment is missing." }, 400);

    const noteHtml = message ? `<p>${escapeHtml(String(message)).replace(/\n/g, "<br>")}</p>` : "";
    const html = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-bottom: 3px solid #3b82f6;">
          <h2 style="color: #1e293b; margin: 0;">Pio-Tech Support Portal</h2>
        </div>
        <div style="padding: 24px; line-height: 1.6; font-size: 15px;">
          <p>Dears,</p>
          ${noteHtml}
          <p>Please find the attached report: <strong>${escapeHtml(String(attachment.name))}</strong></p>
          <p>Best Regards,<br>Pio-Tech Support Team</p>
        </div>
        <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
          Sent from the Pio-Tech Support Portal.
        </div>
      </div>
    `;

    const results: { email: string; status: "sent" | "failed"; error?: string }[] = [];
    for (const to of list) {
      let status: "sent" | "failed" = "sent";
      let errorMessage: string | null = null;
      try {
        await sendEmail({
          to,
          subject,
          html,
          attachments: [{
            name: String(attachment.name),
            contentBytes: String(attachment.contentBytes),
            contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          }],
        });
      } catch (err: any) {
        status = "failed";
        errorMessage = err.message;
      }
      results.push({ email: to, status, ...(errorMessage ? { error: errorMessage } : {}) });

      try {
        await admin.from("email_logs").insert({
          recipient_email: to,
          subject,
          status,
          error_message: errorMessage,
          related_ticket_id: null,
        });
      } catch (logErr) {
        console.error("Failed to log email to database:", logErr);
      }
    }

    return json({ results });
  } catch (err: any) {
    console.error("send-report-email error:", err);
    return json({ error: err.message }, 500);
  }
});
