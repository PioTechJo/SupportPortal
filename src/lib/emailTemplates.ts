import { supabase } from './supabase';

export function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => vars[key] ?? '');
}

export interface RecipientContext {
  assigneeId?: string | null;
  developerId?: string | null;
  createdById?: string | null;
  followerIds?: string[];
}

async function emailForUserId(userId?: string | null): Promise<string | null> {
  if (!userId) return null;
  const { data } = await supabase.rpc('get_user_email', { p_user_id: userId });
  return data || null;
}

const BANK_ROLE_CODES = ['BANK_USER', 'BANK_MANAGER', 'BANK_ADMIN'];

// Reads a comma-separated list of addresses from system_settings.
async function emailsFromSetting(settingKey: string, fallback: string[] = []): Promise<string[]> {
  const { data: setting } = await supabase
    .from('system_settings')
    .select('setting_value')
    .eq('setting_key', settingKey)
    .maybeSingle();
  const list = String(setting?.setting_value || '')
    .split(',')
    .map((e: string) => e.trim())
    .filter(Boolean);
  return list.length > 0 ? list : fallback;
}

// Turns the admin-selected recipient roles (e.g. ["assignee", "customer", "support_email"])
// into a de-duplicated list of real email addresses, using whatever ids are
// available at the call site. Roles with no matching id/data are silently skipped.
export async function resolveRecipientEmails(
  roles: string[],
  ctx: RecipientContext
): Promise<string[]> {
  const emails = new Set<string>();

  for (const role of roles) {
    switch (role) {
      case 'assignee': {
        const email = await emailForUserId(ctx.assigneeId);
        if (email) emails.add(email);
        break;
      }
      case 'developer': {
        const email = await emailForUserId(ctx.developerId);
        if (email) emails.add(email);
        break;
      }
      case 'customer': {
        // Bank users: the ticket creator when they are a bank user (a ticket an
        // admin opened on the bank's behalf is created by the admin, who is
        // not the bank), plus the bank users picked to follow the ticket.
        if (ctx.createdById) {
          const { data: creator } = await supabase
            .from('users')
            .select('email, roles:roles!users_role_id_fkey(role_code)')
            .eq('id', ctx.createdById)
            .maybeSingle();
          if (creator) {
            // Internal staff (e.g. the admin, who also belongs to the
            // "Pio-Tech Internal" customer) are never "the bank".
            const roleRow: any = Array.isArray((creator as any).roles) ? (creator as any).roles[0] : (creator as any).roles;
            const roleCode = String(roleRow?.role_code || '').toUpperCase();
            if (BANK_ROLE_CODES.includes(roleCode) && creator.email) emails.add(creator.email);
          } else {
            // Row not readable from here — fall back to the plain address lookup.
            const email = await emailForUserId(ctx.createdById);
            if (email) emails.add(email);
          }
        }
        if (ctx.followerIds && ctx.followerIds.length > 0) {
          const { data: followerUsers } = await supabase
            .from('users')
            .select('email')
            .in('id', ctx.followerIds);
          (followerUsers || []).forEach((u: any) => u.email && emails.add(u.email));
        }
        break;
      }
      case 'admin': {
        const { data: adminRows } = await supabase.rpc('get_admin_user_ids');
        const adminIds = (adminRows || []).map((r: any) => r.id);
        if (adminIds.length > 0) {
          const { data: adminUsers } = await supabase.from('users').select('email').in('id', adminIds);
          (adminUsers || []).forEach((u: any) => u.email && emails.add(u.email));
        }
        break;
      }
      case 'management_escalation': {
        // CEO / Deputy / PS Director / Support Manager aren't system users yet —
        // same fixed-mailbox-list pattern as support_group, just a different setting.
        (await emailsFromSetting('management_escalation_recipients')).forEach(e => emails.add(e));
        break;
      }
      case 'support_email': {
        // support@ — the individual support mailbox.
        (await emailsFromSetting('support_email', ['support@pio-tech.com'])).forEach(e => emails.add(e));
        break;
      }
      case 'support_team_email': {
        // support.team@ — the support team mailbox.
        (await emailsFromSetting('support_team_email', ['support.team@pio-tech.com'])).forEach(e => emails.add(e));
        break;
      }
      case 'support_group': {
        // Both support mailboxes (the shared list editable from the Email
        // Templates page) — not a per-user lookup.
        (await emailsFromSetting('support_group_email')).forEach(e => emails.add(e));
        break;
      }
    }
  }

  return [...emails];
}

export interface EmailDispatch {
  subject: string;
  body: string;
  recipientEmails: string[]; // To
  ccEmails: string[];        // CC (never repeats an address already in To)
}

// One-stop call for a notification trigger: loads the admin-edited template +
// recipient selection, fills in the live ticket data, and resolves the chosen
// roles into real email addresses. Falls back to a hardcoded subject/body/single
// recipient if no template row exists yet, so notifications never silently stop
// working (e.g. before a migration adding a new trigger has been run).
export async function getEmailDispatch(
  triggerKey: string,
  vars: Record<string, string>,
  ctx: RecipientContext,
  fallback: { subject: string; body: string; defaultRoles: string[]; defaultCcRoles?: string[] }
): Promise<EmailDispatch> {
  const withoutDuplicates = (to: string[], cc: string[]) => {
    const toSet = new Set(to.map(e => e.toLowerCase()));
    return cc.filter(e => !toSet.has(e.toLowerCase()));
  };

  try {
    const { data } = await supabase
      .from('email_templates')
      .select('subject_template, body_template, recipient_roles, cc_roles')
      .eq('trigger_key', triggerKey)
      .maybeSingle();

    // Once a template row exists, its recipient_roles is authoritative — even if
    // the admin intentionally cleared it to send to no one. Only fall back to the
    // hardcoded default roles when the row itself is missing.
    const roles: string[] = data ? (data.recipient_roles || []) : fallback.defaultRoles;
    const ccRoles: string[] = data ? (data.cc_roles || []) : (fallback.defaultCcRoles || []);

    const recipientEmails = await resolveRecipientEmails(roles, ctx);
    const ccEmails = withoutDuplicates(recipientEmails, await resolveRecipientEmails(ccRoles, ctx));

    if (!data) {
      return { subject: fallback.subject, body: fallback.body, recipientEmails, ccEmails };
    }

    return {
      subject: fillTemplate(data.subject_template, vars),
      body: fillTemplate(data.body_template, vars),
      recipientEmails,
      ccEmails,
    };
  } catch (err) {
    console.error(`Failed to load email template for ${triggerKey}:`, err);
    const recipientEmails = await resolveRecipientEmails(fallback.defaultRoles, ctx);
    const ccEmails = withoutDuplicates(recipientEmails, await resolveRecipientEmails(fallback.defaultCcRoles || [], ctx));
    return { subject: fallback.subject, body: fallback.body, recipientEmails, ccEmails };
  }
}

// Sends a dispatch as ONE email (all To recipients on the To line, CC on CC).
// Nothing is sent when there is no To recipient.
export async function sendDispatchEmail(dispatch: EmailDispatch, ticketId?: string): Promise<void> {
  if (dispatch.recipientEmails.length === 0) {
    console.warn(`Email "${dispatch.subject}" has no To recipients; not sent.`);
    return;
  }
  const { error } = await supabase.functions.invoke('send-email', {
    body: {
      to: dispatch.recipientEmails,
      cc: dispatch.ccEmails,
      subject: dispatch.subject,
      body: dispatch.body,
      ticket_id: ticketId,
    },
  });
  if (error) console.error(`Error sending email "${dispatch.subject}":`, error);
}
