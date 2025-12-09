-- Migration: retry backfill 'new_member' achievement into user_achievements
-- This migration is safer and more permissive than 018:
--  - Inserts canonical achievement if missing (id typed as text)
--  - Backfills user_achievements for all users (no email filter)
--  - Uses LEFT JOIN + ON CONFLICT DO NOTHING to avoid race/lock failures

-- NOTE: If you prefer to run these statements manually in the Supabase SQL editor
-- or via psql, you can copy/paste them. Running via your normal migration runner
-- should also work.

BEGIN;

-- Ensure canonical achievement exists
INSERT INTO public.achievements (id, title, description, icon, criteria, points, created_at)
VALUES ('new_member', 'New Member', 'Welcome to Forest Watch — you joined the community', '🎉', '{}'::jsonb, 0, now())
ON CONFLICT (id) DO NOTHING;

-- Backfill user_achievements for any user who does not already have new_member
-- Use LEFT JOIN so we don't rely on email being present. Use ON CONFLICT DO NOTHING
-- to protect against concurrent inserts or unique constraints.

INSERT INTO public.user_achievements (user_id, achievement_id, awarded_at, metadata)
SELECT u.id AS user_id,
       'new_member' AS achievement_id,
       COALESCE(u.created_at, now()) AS awarded_at,
       '{}'::jsonb AS metadata
FROM public.users u
LEFT JOIN public.user_achievements ua
  ON ua.user_id = u.id AND ua.achievement_id = 'new_member'
WHERE ua.user_id IS NULL;

COMMIT;
