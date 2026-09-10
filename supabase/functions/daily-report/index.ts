import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => vars[key] ?? '');
}

function buildAttachmentBase64(list: any[]): string {
  const worksheet = XLSX.utils.json_to_sheet(
    list.length > 0
      ? list.map(t => ({
          'Ticket ID': t.ticket_id || '',
          'Current Status': 'Under Process',
          'Status': t.status_name || '',
          'Opened Date': t.opened_date ? new Date(t.opened_date) : '',
          'Due Date': t.due_date ? new Date(t.due_date) : '',
          'Assigned To': t.assigned_to_name || 'Unassigned',
          'Severity': t.severity || '',
          'Tiket #': t.ticket_no || '',
          'Synopsis': t.subject || '',
          'Closed': t.closed_date ? new Date(t.closed_date) : '',
          'Problem Description': t.description || '',
          'Solution': t.solution || '',
          'Account Name': t.account_name || '',
        }))
      : [{ 'Ticket ID': '', 'Current Status': '', Status: 'No pending tickets', 'Opened Date': '', 'Due Date': '', 'Assigned To': '', Severity: '', 'Tiket #': '', Synopsis: '', Closed: '', 'Problem Description': '', Solution: '', 'Account Name': '' }]
  , { cellDates: true });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Pending Tickets');
  // Get the raw bytes and base64-encode them ourselves with btoa, rather than
  // relying on the library's own base64 output — its internal Buffer-based
  // encoding path behaves unreliably under Deno and was producing corrupted
  // .xlsx attachments.
  // XLSX.write's 'array' output can come back as a plain ArrayBuffer rather
  // than a Uint8Array depending on the runtime, so normalize it explicitly.
  const wbBytes = new Uint8Array(XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }));
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < wbBytes.length; i += chunkSize) {
    binary += String.fromCharCode(...wbBytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
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

    // The daily report splits into two separate emails, each with its own
    // dedicated recipient setting (neither reuses the general-purpose
    // "Support Group" mailbox used by other notification templates):
    //   1. Every pending ticket, regardless of assignee -> daily_report_all_recipients.
    //   2. Only pending tickets assigned to a Support team member -> daily_report_support_recipients.
    const [{ data: allRecipientsSetting }, { data: supportRecipientsSetting }] = await Promise.all([
      supabase.from('system_settings').select('setting_value').eq('setting_key', 'daily_report_all_recipients').maybeSingle(),
      supabase.from('system_settings').select('setting_value').eq('setting_key', 'daily_report_support_recipients').maybeSingle(),
    ]);

    const parseRecipients = (value: string | undefined | null) =>
      (value || '').split(',').map((e: string) => e.trim()).filter(Boolean);

    const allRecipients = parseRecipients(allRecipientsSetting?.setting_value);
    const supportRecipients = parseRecipients(supportRecipientsSetting?.setting_value);

    // Pending tickets list (each row flags whether its assignee is on the Support team)
    const { data: pendingTickets, error: pendingError } = await supabase.rpc('get_pending_tickets_list');
    if (pendingError) throw pendingError;

    const pendingList: any[] = pendingTickets || [];
    const supportPendingList = pendingList.filter(t => t.is_support_assignee);
    const reportDate = new Date().toLocaleDateString('en-GB');

    const { data: template } = await supabase
      .from('email_templates')
      .select('subject_template, body_template')
      .eq('trigger_key', 'DAILY_REPORT')
      .maybeSingle();

    const buildEmail = (list: any[]) => {
      const vars: Record<string, string> = {
        pending_count: String(list.length),
        report_date: reportDate,
      };
      const subject = template
        ? fillTemplate(template.subject_template, vars)
        : `Daily Pending Tickets Report - ${vars.report_date}`;
      const rawBody = template
        ? fillTemplate(template.body_template, vars)
        : `There are ${vars.pending_count} pending ticket(s) as of ${vars.report_date}. Please see the attached spreadsheet for the full list.`;

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

      return { subject, htmlBody, attachmentBase64: buildAttachmentBase64(list) };
    };

    const sendReport = async (list: any[], recipients: string[], attachmentSuffix: string) => {
      if (recipients.length === 0) return [];
      const { subject, htmlBody, attachmentBase64 } = buildEmail(list);
      const attachmentName = `pending-tickets-${attachmentSuffix}-${reportDate.replace(/\//g, '-')}.xlsx`;

      const results = [];
      for (const to of recipients) {
        let status = 'sent';
        let errorMessage = null;
        try {
          const res = await fetch(POWER_AUTOMATE_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to,
              subject,
              htmlBody,
              attachments: [{
                name: attachmentName,
                contentBytes: attachmentBase64,
                contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              }],
            }),
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
      return results;
    };

    const [allResults, supportResults] = await Promise.all([
      sendReport(pendingList, allRecipients, 'all'),
      sendReport(supportPendingList, supportRecipients, 'support'),
    ]);

    return new Response(JSON.stringify({
      success: true,
      all: { recipients: allRecipients, count: pendingList.length, results: allResults },
      support: { recipients: supportRecipients, count: supportPendingList.length, results: supportResults },
    }), {
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
