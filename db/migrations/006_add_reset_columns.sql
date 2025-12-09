-- Add password reset columns to users table
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS reset_code text,
  ADD COLUMN IF NOT EXISTS reset_expires bigint;

CREATE INDEX IF NOT EXISTS idx_users_reset_expires ON public.users (reset_expires);
