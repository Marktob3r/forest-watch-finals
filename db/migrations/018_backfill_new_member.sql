-- Migration: backfill 'new_member' achievement into user_achievements
-- 1) ensure canonical achievement exists
-- 2) insert a user_achievements row for any user missing the 'new_member' award

BEGIN;

-- Ensure canonical achievement exists
INSERT INTO public.achievements (id, title, description, icon, criteria, points, created_at)
VALUES ('new_member', 'New Member', 'Welcome to Forest Watch — you joined the community', '🎉', '{}'::jsonb, 0, now())
ON CONFLICT (id) DO NOTHING;

-- Backfill user_achievements for users who do not already have new_member
INSERT INTO public.user_achievements (user_id, achievement_id, awarded_at, metadata)
SELECT u.id AS user_id, 'new_member' AS achievement_id, COALESCE(u.created_at, now()) AS awarded_at, '{}'::jsonb AS metadata
FROM public.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_achievements ua WHERE ua.user_id = u.id AND ua.achievement_id = 'new_member'
)
AND u.email IS NOT NULL; -- only for real user records

COMMIT;
