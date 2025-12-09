-- Migration: create user_achievements table
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  achievement_id text REFERENCES public.achievements(id) ON DELETE CASCADE,
  awarded_at timestamptz DEFAULT now(),
  metadata jsonb
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON public.user_achievements (user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement ON public.user_achievements (achievement_id);
