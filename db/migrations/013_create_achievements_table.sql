-- Migration: create achievements table (master definitions)
CREATE TABLE IF NOT EXISTS public.achievements (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text,
  icon text,
  criteria jsonb,
  points integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_achievements_title ON public.achievements (title);
