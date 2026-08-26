import { supabase } from './supabase';

export function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => vars[key] ?? '');
}

export interface RecipientContext {
  assigneeId?: string | null;
  developerId?: string | null;
  createdById?: string | null;
}

async function emailForUserId(userId?: string | null): Promise<string | null> {
  if (!userId) return null;
  const { data } = await supabase.rpc('get_user_email', { p_user_id: userId });
  return data || null;
}

// Turns the admin-selected recipient roles (e.g. ["assignee", "customer", "support_group"])
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
        const email = await emailForUserId(ctx.createdById);
        if (email) emails.add(email);
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
      case 'support_group': {
        // A fixed shared mailbox/alias (e.g. support.team@pio-tech.com), editable
        // by admins from the Email Templates page — not a per-user lookup.
        const { data: setting } = await supabase
          .from('system_settings')
          .select('setting_value')
          .eq('setting_key', 'support_group_email')
          .maybeSingle();
        (setting?.setting_value || '')
          .split(',')
          .map((e: string) => e.trim())
          .filter(Boolean)
          .forEach((e: string) => emails.add(e));
        break;
      }
    }
  }

  return [...emails];
}

interface EmailDispatch {
  subject: string;
  body: string;
  recipientEmails: string[];
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
  fallback: { subject: string; body: string; defaultRoles: string[] }
): Promise<EmailDispatch> {
  try {
    const { data } = await supabase
      .from('email_templates')
      .select('subject_template, body_template, recipient_roles')
      .eq('trigger_key', triggerKey)
      .maybeSingle();

    // Once a template row exists, its recipient_roles is authoritative — even if
    // the admin intentionally cleared it to send to no one. Only fall back to the
    // hardcoded default roles when the row itself is missing.
    const roles: string[] = data ? (data.recipient_roles || []) : fallback.defaultRoles;

    const recipientEmails = await resolveRecipientEmails(roles, ctx);

    if (!data) {
      return { subject: fallback.subject, body: fallback.body, recipientEmails };
    }

    return {
      subject: fillTemplate(data.subject_template, vars),
      body: fillTemplate(data.body_template, vars),
      recipientEmails,
    };
  } catch (err) {
    console.error(`Failed to load email template for ${triggerKey}:`, err);
    const recipientEmails = await resolveRecipientEmails(fallback.defaultRoles, ctx);
    return { subject: fallback.subject, body: fallback.body, recipientEmails };
  }
}
