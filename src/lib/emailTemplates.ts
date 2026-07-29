import { supabase } from './supabase';

export function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => vars[key] ?? '');
}

// Looks up the admin-configured template for a trigger point and fills in the
// live ticket data. Falls back to a hardcoded subject/body if no row exists yet
// (e.g. before the email_templates migration has been run) so notifications
// never silently stop working.
export async function getRenderedEmail(
  triggerKey: string,
  vars: Record<string, string>,
  fallback: { subject: string; body: string }
): Promise<{ subject: string; body: string }> {
  try {
    const { data } = await supabase
      .from('email_templates')
      .select('subject_template, body_template')
      .eq('trigger_key', triggerKey)
      .maybeSingle();

    if (!data) return fallback;

    return {
      subject: fillTemplate(data.subject_template, vars),
      body: fillTemplate(data.body_template, vars),
    };
  } catch (err) {
    console.error(`Failed to load email template for ${triggerKey}:`, err);
    return fallback;
  }
}
