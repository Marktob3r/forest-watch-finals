-- Migration: add profile_image_url to users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS profile_image_url text;

-- Optional: index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_profile_image_url ON public.users (profile_image_url);
