-- Remove classroom game data and unregistered demo student profiles while
-- preserving linked accounts, teacher accounts, credentials, and sessions.
-- Uploaded objects in the quest-submissions Storage bucket are separate from
-- these database rows and must be removed from Storage separately if needed.

BEGIN;

DELETE FROM public.submissions;
DELETE FROM public.quest_progress;
DELETE FROM public.spin_history;
UPDATE public.users SET team_id = NULL;
DELETE FROM public.teams;
DELETE FROM public.users
WHERE role = 'student' AND auth_user_id IS NULL;
DELETE FROM public.quests;
DELETE FROM public.admin_settings WHERE key = 'seed_version';

INSERT INTO public.admin_settings (key, value, updated_at)
VALUES
  ('quests_open', 'true'::jsonb, now()),
  ('spin_state', '{"wheel":[],"done":[],"winner":null}'::jsonb, now())
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    updated_at = EXCLUDED.updated_at;

COMMIT;

SELECT 'users' AS table_name, count(*) AS rows FROM public.users
UNION ALL SELECT 'teams', count(*) FROM public.teams
UNION ALL SELECT 'quests', count(*) FROM public.quests
UNION ALL SELECT 'submissions', count(*) FROM public.submissions
UNION ALL SELECT 'quest_progress', count(*) FROM public.quest_progress
UNION ALL SELECT 'spin_history', count(*) FROM public.spin_history;
