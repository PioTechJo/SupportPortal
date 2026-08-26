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
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const POWER_AUTOMATE_WEBHOOK_URL = Deno.env.get("POWER_AUTOMATE_EMAIL_WEBHOOK_URL");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase environment configuration is missing.");
    }
    if (!POWER_AUTOMATE_WEBHOOK_URL) {
      throw new Error("POWER_AUTOMATE_EMAIL_WEBHOOK_URL is not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Recipients — falls back to the shared Support Group mailbox if no
    // explicit list has been configured on the Daily Report admin page.
    const [{ data: recipientsSetting }, { data: supportGroupSetting }] = await Promise.all([
      supabase.from('system_settings').select('setting_value').eq('setting_key', 'daily_report_recipients').maybeSingle(),
      supabase.from('system_settings').select('setting_value').eq('setting_key', 'support_group_email').maybeSingle(),
    ]);

    const recipients = (recipientsSetting?.setting_value || supportGroupSetting?.setting_value || '')
      .split(',')
      .map((e: string) => e.trim())
      .filter(Boolean);

    if (recipients.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No recipients configured, nothing sent." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Pending tickets list
    const { data: pendingTickets, error: pendingError } = await supabase.rpc('get_pending_tickets_list');
    if (pendingError) throw pendingError;

    const pendingList: any[] = pendingTickets || [];
    const pendingLinesText = pendingList.length > 0
      ? pendingList.map(t => `${t.ticket_no} - ${t.subject} (${t.status_name}, ${t.days_open}d open)`).join('\n')
      : 'No pending tickets.';

    const vars: Record<string, string> = {
      pending_count: String(pendingList.length),
      pending_tickets_list: pendingLinesText,
      report_date: new Date().toLocaleDateString('en-GB'),
    };

    // 3. Template
    const { data: template } = await supabase
      .from('email_templates')
      .select('subject_template, body_template')
      .eq('trigger_key', 'DAILY_REPORT')
      .maybeSingle();

    const subject = template
      ? fillTemplate(template.subject_template, vars)
      : `Daily Pending Tickets Report - ${vars.report_date}`;
    const rawBody = template
      ? fillTemplate(template.body_template, vars)
      : `Pending tickets (${vars.pending_count}):\n\n${vars.pending_tickets_list}`;

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-bottom: 3px solid #3b82f6;">
          <h2 style="color: #1e293b; margin: 0;">Pio-Tech Support Portal</h2>
        </div>
        <div style="padding: 24px; line-height: 1.6; font-size: 15px;">
          ${rawBody.replace(/\n/g, '<br>')}
        </div>
        <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
          This is an automated notification from the Pio-Tech Support Portal.<br>
          Please do not reply directly to this email.
        </div>
      </div>
    `;

    // 4. Send to each recipient and log
    const results = [];
    for (const to of recipients) {
      let status = 'sent';
      let errorMessage = null;
      try {
        const res = await fetch(POWER_AUTOMATE_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to, subject, htmlBody }),
        });
        if (!res.ok) {
          status = 'failed';
          errorMessage = `Power Automate webhook returned ${res.status}: ${await res.text()}`;
        }
      } catch (err: any) {
        status = 'failed';
        errorMessage = err.message;
      }

      try {
        await supabase.from('email_logs').insert({
          recipient_email: to,
          subject,
          status,
          error_message: errorMessage,
          related_ticket_id: null,
        });
      } catch (logErr) {
        console.error("Failed to log daily report email:", logErr);
      }

      results.push({ to, status });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Daily report error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
