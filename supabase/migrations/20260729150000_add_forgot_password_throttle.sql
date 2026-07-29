-- Supports the public self-service "Forgot password" flow (forgot-password
-- Edge Function): tracks the last reset request per account so the endpoint
-- can throttle repeated requests without needing to reveal account existence.

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS last_password_reset_requested_at timestamptz;
