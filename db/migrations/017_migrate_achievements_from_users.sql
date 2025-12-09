-- Migration: migrate achievements JSONB from users -> achievements + user_achievements
-- 1) seed canonical achievement definitions (from app's ACHIEVEMENTS list)
-- 2) ensure any achievement ids present on users are present in achievements
-- 3) migrate user achievements into user_achievements
-- 4) add uniqueness constraint and drop users.achievements column

BEGIN;

-- Seed canonical achievements (safe to run repeatedly)
INSERT INTO public.achievements (id, title, description, icon, criteria, points, created_at)
VALUES
  ('new_member', 'New Member', 'Welcome to Forest Watch — you joined the community', '🎉', '{}'::jsonb, 0, now()),
  ('first_report', 'First Report', 'Submitted your first report', '📝', '{}'::jsonb, 0, now()),
  ('report_10', 'Reporter — 10', 'Submitted 10 reports', '📈', '{}'::jsonb, 0, now()),
  ('report_50', 'Reporter — 50', 'Submitted 50 reports', '🏆', '{}'::jsonb, 0, now()),
  ('community_builder', 'Community Builder', 'Followed 5 projects', '🤝', '{}'::jsonb, 0, now()),
  ('early_adopter', 'Early Adopter', 'One of the first 100 users', '🌟', '{}'::jsonb, 0, now()),
  ('report_champion', 'Report Champion', 'Submitted 20+ reports', '🏅', '{}'::jsonb, 0, now()),
  ('community_leader', 'Community Leader', 'Active community member', '👥', '{}'::jsonb, 0, now()),
  ('first_alert', 'First Alert', 'Received your first alert', '🔔', '{}'::jsonb, 0, now()),
  ('shield_keeper', 'Privacy Advocate', 'Enabled all privacy settings', '🛡️', '{}'::jsonb, 0, now()),
  ('two_factor', 'Secure Account', 'Enabled two-factor authentication', '🔐', '{}'::jsonb, 0, now()),
  ('map_explorer', 'Map Explorer', 'Visited the Monitor map 10 times', '🗺️', '{}'::jsonb, 0, now()),
  ('ndvi_tracker', 'NDVI Watcher', 'Viewed NDVI charts for 7 consecutive days', '🌿', '{}'::jsonb, 0, now()),
  ('bug_reporter', 'Bug Reporter', 'Submitted a bug report that was fixed', '🐞', '{}'::jsonb, 0, now()),
  ('mentor', 'Mentor', 'Helped onboard 5 users', '🎓', '{}'::jsonb, 0, now()),
  ('sustainer', 'Sustainer', 'Contributed 100 edits', '🌱', '{}'::jsonb, 0, now()),
  ('volunteer', 'Volunteer', 'Volunteered in a community project', '🤲', '{}'::jsonb, 0, now()),
  ('long_time_user', 'One Year', 'Been on Forest Watch for 1 year', '🎉', '{}'::jsonb, 0, now()),
  ('night_owl', 'Night Owl', 'Used the app between 2–4 AM 5 times', '🌙', '{}'::jsonb, 0, now()),
  ('streak_7', '7-Day Streak', 'Logged in for 7 consecutive days', '🔥', '{}'::jsonb, 0, now()),
  ('streak_30', '30-Day Streak', 'Logged in for 30 consecutive days', '💪', '{}'::jsonb, 0, now())
ON CONFLICT (id) DO NOTHING;

-- Ensure any achievement ids present in users.achievements are present in achievements
INSERT INTO public.achievements (id, title, description, created_at)
SELECT DISTINCT ach ->> 'id' AS id, ach ->> 'id' AS title, NULL AS description, now()
FROM public.users, jsonb_array_elements(coalesce(users.achievements, '[]'::jsonb)) AS ach
WHERE (ach ->> 'id') IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.achievements a WHERE a.id = (ach ->> 'id'));

-- Migrate per-user achievements into user_achievements (avoid duplicates)
INSERT INTO public.user_achievements (id, user_id, achievement_id, awarded_at, metadata)
SELECT gen_random_uuid() AS id,
       u.id AS user_id,
       (ach ->> 'id')::text AS achievement_id,
       CASE
         WHEN (ach ->> 'achievedAt') IS NOT NULL THEN (ach ->> 'achievedAt')::timestamptz
         WHEN (ach ->> 'awardedAt') IS NOT NULL THEN (ach ->> 'awardedAt')::timestamptz
         ELSE now()
       END AS awarded_at,
       ach AS metadata
FROM public.users u,
     jsonb_array_elements(coalesce(u.achievements, '[]'::jsonb)) AS ach
WHERE (ach ->> 'id') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.user_achievements ua
    WHERE ua.user_id = u.id AND ua.achievement_id = (ach ->> 'id')
  );

-- Add uniqueness constraint to prevent future duplicates (user_id, achievement_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE tablename = 'user_achievements' AND indexname = 'uniq_user_achievement'
  ) THEN
    ALTER TABLE public.user_achievements
      ADD CONSTRAINT uniq_user_achievement UNIQUE (user_id, achievement_id);
  END IF;
END$$;

-- Finally remove the achievements JSONB column from users (data migrated)
ALTER TABLE public.users DROP COLUMN IF EXISTS achievements;

COMMIT;
