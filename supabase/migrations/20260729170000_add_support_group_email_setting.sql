-- The "Support Group" recipient option resolves to this fixed shared mailbox
-- (not a per-user role lookup). Editable from the Email Templates admin page.

INSERT INTO public.system_settings (setting_key, setting_value)
VALUES ('support_group_email', 'support.team@pio-tech.com')
ON CONFLICT (setting_key) DO NOTHING;
