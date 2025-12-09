-- Migration: add profile_image_path to users (store storage path, not signed/public URL)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS profile_image_path text;

-- Optional: index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_profile_image_path ON public.users (profile_image_path);
