-- Editable email template for the new admin-triggered password reset flow
-- (send-password-reset Edge Function). Replaces the previous broken/incomplete
-- Supabase Auth magic-link flow, which had no landing page to complete it and
-- conflicts with this app's HashRouter routing.

INSERT INTO public.email_templates (trigger_key, trigger_label, available_variables, subject_template, body_template) VALUES
('PASSWORD_RESET', 'Password Reset -> User',
  '[{"key":"email","label":"User Email"},{"key":"temp_password","label":"New Password"}]',
  'Your Support Portal password has been reset',
  E'Hello,\n\nYour password for the Pio-Tech Support Portal has been reset by an administrator.\n\nEmail: {{email}}\nNew Password: {{temp_password}}\n\nPlease log in with this password and change it as soon as possible from your account settings.'
)
ON CONFLICT (trigger_key) DO NOTHING;
