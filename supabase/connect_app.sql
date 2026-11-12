-- Questcraft Supabase Auth and row-level access.
-- Run in Supabase SQL Editor after the application tables exist.
-- Do not run seed_demo.sql when using real classroom data.
-- This does not expose write access to anon or create teacher credentials automatically.
-- Students and teachers use password credentials with anonymous Auth sessions.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'student';

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
DECLARE
  value_type text;
BEGIN
  SELECT udt_name INTO value_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'admin_settings'
    AND column_name = 'value';

  IF value_type IS NULL THEN
    RAISE EXCEPTION 'ไม่พบคอลัมน์ public.admin_settings.value';
  END IF;
  IF value_type <> 'jsonb' THEN
    ALTER TABLE public.admin_settings
      ALTER COLUMN value TYPE jsonb USING to_jsonb(value::text);
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.questcraft_auth_sessions (
  auth_user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id bigint NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.questcraft_credentials (
  user_id bigint PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.questcraft_teacher_accounts (
  username text PRIMARY KEY CHECK (username <> '' AND username = lower(btrim(username))),
  password_hash text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.questcraft_teacher_sessions (
  auth_user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL REFERENCES public.questcraft_teacher_accounts(username) ON DELETE CASCADE
);

REVOKE ALL ON TABLE public.questcraft_auth_sessions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.questcraft_credentials FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.questcraft_teacher_accounts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.questcraft_teacher_sessions FROM PUBLIC, anon, authenticated;
ALTER TABLE public.questcraft_auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questcraft_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questcraft_teacher_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questcraft_teacher_sessions ENABLE ROW LEVEL SECURITY;

INSERT INTO public.questcraft_credentials (user_id, password_hash)
SELECT u.id, au.encrypted_password
FROM public.users AS u
JOIN auth.users AS au ON au.id::text = u.auth_user_id::text
WHERE u.role IN ('student', 'teacher')
  AND au.encrypted_password <> ''
ON CONFLICT (user_id) DO NOTHING;

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS capacity integer NOT NULL DEFAULT 5;

ALTER TABLE public.quests
  ADD COLUMN IF NOT EXISTS accepts text[] NOT NULL DEFAULT ARRAY['text', 'file', 'link']::text[],
  ADD COLUMN IF NOT EXISTS file_types text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS example jsonb;

ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS submitted_by_user_id bigint REFERENCES public.users(id) ON DELETE SET NULL;

UPDATE public.submissions AS s
SET submitted_by_user_id = t.creator_id
FROM public.teams AS t
WHERE s.team_id = t.id
  AND s.submitted_by_user_id IS NULL;

INSERT INTO public.admin_settings (key, value, updated_at)
VALUES
  ('quests_open', 'true'::jsonb, now()),
  ('spin_state', '{"wheel":[],"done":[],"winner":null}'::jsonb, now())
ON CONFLICT (key) DO NOTHING;

CREATE UNIQUE INDEX IF NOT EXISTS users_auth_user_id_key
  ON public.users (auth_user_id)
  WHERE auth_user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_registered_classroom_number_key
  ON public.users (classroom, number)
  WHERE auth_user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS quest_progress_team_quest_key
  ON public.quest_progress (team_id, quest_id);

CREATE UNIQUE INDEX IF NOT EXISTS submissions_one_pending_per_quest
  ON public.submissions (team_id, quest_id)
  WHERE status = 'pending';

DROP TRIGGER IF EXISTS questcraft_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_questcraft_auth_user();

CREATE OR REPLACE FUNCTION public.current_questcraft_user_id()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT session.user_id
      FROM public.questcraft_auth_sessions AS session
      WHERE session.auth_user_id = auth.uid()
    ),
    (
      SELECT profile.id
      FROM public.users AS profile
      WHERE profile.auth_user_id::text = auth.uid()::text
      LIMIT 1
    )
  )
$$;

CREATE OR REPLACE FUNCTION public.current_questcraft_teacher_username()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT session.username
  FROM public.questcraft_teacher_sessions AS session
  WHERE session.auth_user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.current_questcraft_team_id()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT team_id
  FROM public.users
  WHERE id = public.current_questcraft_user_id()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_questcraft_teacher()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.questcraft_teacher_sessions AS session
      JOIN public.questcraft_teacher_accounts AS account USING (username)
      WHERE session.auth_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.users AS profile
      WHERE profile.id = public.current_questcraft_user_id()
        AND profile.role = 'teacher'
    )
$$;

CREATE OR REPLACE FUNCTION public.set_questcraft_quests_open(p_open boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_questcraft_teacher() THEN
    RAISE EXCEPTION 'เฉพาะครูเท่านั้นที่เปลี่ยนสถานะรับภารกิจได้';
  END IF;

  INSERT INTO public.admin_settings (key, value, updated_at)
  VALUES ('quests_open', to_jsonb(p_open), now())
  ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_questcraft_spin_state(p_state jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_questcraft_teacher() THEN
    RAISE EXCEPTION 'เฉพาะครูเท่านั้นที่แก้ไขวงล้อได้';
  END IF;
  IF p_state IS NULL OR jsonb_typeof(p_state) <> 'object' THEN
    RAISE EXCEPTION 'ข้อมูลวงล้อไม่ถูกต้อง';
  END IF;

  INSERT INTO public.admin_settings (key, value, updated_at)
  VALUES ('spin_state', p_state, now())
  ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.register_questcraft_student(
  p_first_name text,
  p_last_name text,
  p_classroom text,
  p_number text,
  p_password text
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_first_name text := trim(COALESCE(p_first_name, ''));
  v_last_name text := trim(COALESCE(p_last_name, ''));
  v_classroom text := regexp_replace(trim(COALESCE(p_classroom, '')), '^ม\.[[:space:]]*', '');
  v_number text := trim(COALESCE(p_number, ''));
  v_user_id bigint;
BEGIN
  IF auth.uid() IS NULL OR COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'กรุณาเริ่มลงทะเบียนใหม่';
  END IF;
  IF v_first_name = '' OR v_last_name = '' THEN
    RAISE EXCEPTION 'กรุณากรอกชื่อและนามสกุล';
  END IF;
  IF v_classroom !~ '^[^/]+/[^/]+$' OR split_part(v_classroom, '/', 1) !~ '[0-9]' THEN
    RAISE EXCEPTION 'ชั้น/ห้องต้องอยู่ในรูปแบบ ชั้น/ห้อง และชั้นด้านหน้าต้องมีตัวเลข';
  END IF;
  IF v_number !~ '^[0-9]+$' THEN
    RAISE EXCEPTION 'เลขที่ต้องเป็นตัวเลข';
  END IF;
  IF length(COALESCE(p_password, '')) < 6 THEN
    RAISE EXCEPTION 'รหัสผ่านต้องมีอย่างน้อย 6 ตัว';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.users
    WHERE regexp_replace(trim(classroom), '^ม\.[[:space:]]*', '') = v_classroom
      AND number = v_number
      AND auth_user_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'เลขที่นี้ในห้องนี้ลงทะเบียนแล้ว';
  END IF;

  INSERT INTO public.users
    (first_name, last_name, classroom, number, password_hash, team_id, auth_user_id, role, created_at)
  VALUES
    (v_first_name, v_last_name, v_classroom, v_number, '!questcraft-credential-table!', NULL, auth.uid(), 'student', now())
  RETURNING id INTO v_user_id;

  INSERT INTO public.questcraft_credentials (user_id, password_hash)
  VALUES (v_user_id, crypt(p_password, gen_salt('bf')));

  DELETE FROM public.questcraft_teacher_sessions WHERE auth_user_id = auth.uid();
  INSERT INTO public.questcraft_auth_sessions (auth_user_id, user_id)
  VALUES (auth.uid(), v_user_id)
  ON CONFLICT (auth_user_id) DO UPDATE SET user_id = EXCLUDED.user_id;

  RETURN v_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sign_in_questcraft_student(
  p_classroom text,
  p_number text,
  p_password text
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id bigint;
  v_classroom text := regexp_replace(trim(COALESCE(p_classroom, '')), '^ม\.[[:space:]]*', '');
BEGIN
  IF auth.uid() IS NULL OR COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'กรุณาเริ่มเข้าสู่ระบบใหม่';
  END IF;

  SELECT profile.id INTO v_user_id
  FROM public.users AS profile
  JOIN public.questcraft_credentials AS credential ON credential.user_id = profile.id
  WHERE regexp_replace(trim(profile.classroom), '^ม\.[[:space:]]*', '') = v_classroom
    AND profile.number = trim(COALESCE(p_number, ''))
    AND profile.role = 'student'
    AND credential.password_hash = crypt(COALESCE(p_password, ''), credential.password_hash)
  FOR UPDATE OF profile;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'ชั้น/ห้อง เลขที่ หรือรหัสผ่านไม่ถูกต้อง';
  END IF;

  DELETE FROM public.questcraft_teacher_sessions WHERE auth_user_id = auth.uid();
  INSERT INTO public.questcraft_auth_sessions (auth_user_id, user_id)
  VALUES (auth.uid(), v_user_id)
  ON CONFLICT (auth_user_id) DO UPDATE SET user_id = EXCLUDED.user_id, created_at = now();

  RETURN v_user_id;
END;
$$;

DROP FUNCTION IF EXISTS public.sign_in_questcraft_teacher(text, text);

CREATE FUNCTION public.sign_in_questcraft_teacher(
  p_username text,
  p_password text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_username text;
BEGIN
  IF auth.uid() IS NULL OR COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'กรุณาเริ่มเข้าสู่ระบบใหม่';
  END IF;

  SELECT account.username INTO v_username
  FROM public.questcraft_teacher_accounts AS account
  WHERE account.username = lower(trim(COALESCE(p_username, '')))
    AND account.password_hash = crypt(COALESCE(p_password, ''), account.password_hash)
  FOR UPDATE OF account;

  IF v_username IS NULL THEN
    RAISE EXCEPTION 'Username หรือรหัสผ่านไม่ถูกต้อง';
  END IF;

  DELETE FROM public.questcraft_auth_sessions WHERE auth_user_id = auth.uid();
  INSERT INTO public.questcraft_teacher_sessions (auth_user_id, username)
  VALUES (auth.uid(), v_username)
  ON CONFLICT (auth_user_id) DO UPDATE SET username = EXCLUDED.username;

END;
$$;

CREATE OR REPLACE FUNCTION public.list_questcraft_classrooms()
RETURNS TABLE (classroom text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT regexp_replace(trim(u.classroom), '^ม\.[[:space:]]*', '') AS classroom
  FROM public.users AS u
  WHERE u.auth_user_id IS NOT NULL
  ORDER BY classroom
$$;

CREATE OR REPLACE FUNCTION public.create_questcraft_team(
  p_name text,
  p_cover text,
  p_capacity integer DEFAULT 5
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_id bigint;
  new_team_id bigint;
BEGIN
  SELECT id INTO profile_id
  FROM public.users
  WHERE id = public.current_questcraft_user_id()
  FOR UPDATE;
  IF profile_id IS NULL THEN
    RAISE EXCEPTION 'ไม่พบโปรไฟล์ผู้ใช้';
  END IF;
  IF EXISTS (SELECT 1 FROM public.users WHERE id = profile_id AND team_id IS NOT NULL) THEN
    RAISE EXCEPTION 'คุณอยู่ในทีมแล้ว';
  END IF;
  IF length(trim(p_name)) = 0 OR length(trim(p_name)) > 24 THEN
    RAISE EXCEPTION 'ชื่อทีมต้องมี 1–24 ตัวอักษร';
  END IF;
  IF p_cover NOT IN ('dragon', 'space', 'forest', 'city') THEN
    RAISE EXCEPTION 'ปกทีมไม่ถูกต้อง';
  END IF;
  IF p_capacity < 1 OR p_capacity > 5 THEN
    RAISE EXCEPTION 'ทีมมีสมาชิกได้ 1–5 คน';
  END IF;

  INSERT INTO public.teams (name, cover, creator_id, capacity, created_at)
  VALUES (trim(p_name), p_cover, profile_id, p_capacity, now())
  RETURNING id INTO new_team_id;

  UPDATE public.users SET team_id = new_team_id WHERE id = profile_id;
  RETURN new_team_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.join_questcraft_team(p_team_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_id bigint;
  team_capacity integer;
  member_count integer;
BEGIN
  SELECT id INTO profile_id
  FROM public.users
  WHERE id = public.current_questcraft_user_id()
  FOR UPDATE;
  IF profile_id IS NULL THEN
    RAISE EXCEPTION 'ไม่พบโปรไฟล์ผู้ใช้';
  END IF;

  IF p_team_id IS NULL THEN
    UPDATE public.users SET team_id = NULL WHERE id = profile_id;
    RETURN;
  END IF;

  SELECT capacity INTO team_capacity FROM public.teams WHERE id = p_team_id FOR UPDATE;
  IF team_capacity IS NULL THEN
    RAISE EXCEPTION 'ไม่พบทีม';
  END IF;
  IF EXISTS (SELECT 1 FROM public.users WHERE id = profile_id AND team_id IS NOT NULL) THEN
    RAISE EXCEPTION 'คุณอยู่ในทีมแล้ว';
  END IF;

  SELECT count(*) INTO member_count FROM public.users WHERE team_id = p_team_id;
  IF member_count >= team_capacity THEN
    RAISE EXCEPTION 'ทีมเต็มแล้ว';
  END IF;

  UPDATE public.users SET team_id = p_team_id WHERE id = profile_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_questcraft_answer(p_quest_no integer, p_answer jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id bigint;
  v_team_id bigint;
  v_target_quest record;
  v_highest_cleared integer;
  v_submission_id bigint;
  v_file_name text;
  v_file_extension text;
  v_file_type text;
BEGIN
  SELECT id, users.team_id INTO v_profile_id, v_team_id
  FROM public.users
  WHERE id = public.current_questcraft_user_id()
  FOR UPDATE;
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'ไม่พบโปรไฟล์ผู้ใช้';
  END IF;
  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'ต้องเข้าทีมก่อนส่งภารกิจ';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_settings
    WHERE key = 'quests_open' AND value #>> '{}' = 'true'
  ) THEN
    RAISE EXCEPTION 'ปิดรับภารกิจแล้ว';
  END IF;

  SELECT id, no, accepts, file_types INTO v_target_quest
  FROM public.quests
  WHERE no = p_quest_no AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ไม่พบภารกิจที่เปิดใช้งาน';
  END IF;
  IF p_answer IS NULL OR NOT (p_answer ->> 'kind' = ANY(v_target_quest.accepts)) THEN
    RAISE EXCEPTION 'รูปแบบคำตอบนี้ไม่รองรับในภารกิจ';
  END IF;
  IF p_answer ->> 'kind' = 'file' THEN
    v_file_name := p_answer ->> 'name';
    v_file_extension := lower(substring(v_file_name from '\.([^.]+)$'));
    v_file_type := CASE v_file_extension
      WHEN 'png' THEN 'PNG'
      WHEN 'jpg' THEN 'JPG'
      WHEN 'jpeg' THEN 'JPG'
      WHEN 'pdf' THEN 'PDF'
      WHEN 'mp4' THEN 'MP4'
      WHEN 'mov' THEN 'MOV'
      WHEN 'docx' THEN 'DOCX'
      WHEN 'zip' THEN 'ZIP'
      ELSE NULL
    END;
    IF v_file_type IS NULL THEN
      RAISE EXCEPTION 'รองรับไฟล์ PNG, JPG, PDF, MP4, MOV, DOCX และ ZIP เท่านั้น';
    END IF;
    IF COALESCE(cardinality(v_target_quest.file_types), 0) > 0
      AND NOT EXISTS (
        SELECT 1
        FROM unnest(v_target_quest.file_types) AS accepted_type(value)
        WHERE upper(accepted_type.value) = v_file_type
          OR (v_file_type = 'JPG' AND upper(accepted_type.value) = 'JPEG')
      )
    THEN
      RAISE EXCEPTION 'ชนิดไฟล์นี้ไม่ได้รับอนุญาตในภารกิจ';
    END IF;
  END IF;

  SELECT COALESCE(max(q.no), 0) INTO v_highest_cleared
  FROM public.quest_progress AS p
  JOIN public.quests AS q ON q.id = p.quest_id
  WHERE p.team_id = v_team_id AND p.status = 'cleared';
  IF p_quest_no <> v_highest_cleared + 1 THEN
    RAISE EXCEPTION 'ต้องส่งภารกิจตามลำดับ';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.submissions
    WHERE submissions.team_id = v_team_id
      AND submissions.quest_id = v_target_quest.id
      AND submissions.status = 'pending'
  ) THEN
    RAISE EXCEPTION 'มีงานส่งที่กำลังรอตรวจอยู่แล้ว';
  END IF;

  INSERT INTO public.submissions
    (team_id, quest_id, submitted_by_user_id, answer, status, submitted_at)
  VALUES
    (v_team_id, v_target_quest.id, v_profile_id, p_answer, 'pending', now())
  RETURNING id INTO v_submission_id;

  INSERT INTO public.quest_progress (team_id, quest_id, status, cleared_at)
  VALUES (v_team_id, v_target_quest.id, 'pending', NULL)
  ON CONFLICT (team_id, quest_id)
  DO UPDATE SET status = 'pending', cleared_at = NULL;

  RETURN v_submission_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_questcraft_submission(p_submission_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_id bigint;
  v_quest_id bigint;
  v_answer jsonb;
BEGIN
  SELECT profile.team_id INTO v_team_id
  FROM public.users AS profile
  WHERE profile.id = public.current_questcraft_user_id()
    AND profile.role = 'student'
  FOR UPDATE;
  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'ต้องอยู่ในทีมก่อนยกเลิกการส่ง';
  END IF;

  SELECT quest_id, answer INTO v_quest_id, v_answer
  FROM public.submissions
  WHERE id = p_submission_id
    AND team_id = v_team_id
    AND status = 'pending'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ไม่พบงานส่งที่รอตรวจของทีมนี้';
  END IF;

  DELETE FROM public.submissions WHERE id = p_submission_id;
  DELETE FROM public.quest_progress
  WHERE team_id = v_team_id
    AND quest_id = v_quest_id
    AND status = 'pending';

  RETURN v_answer;
END;
$$;

CREATE OR REPLACE FUNCTION public.review_questcraft_submission(
  p_submission_id bigint,
  p_status text,
  p_feedback text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_team_id bigint;
  target_quest_id bigint;
BEGIN
  IF NOT public.is_questcraft_teacher() THEN
    RAISE EXCEPTION 'เฉพาะครูเท่านั้นที่ตรวจงานได้';
  END IF;
  IF p_status IS NULL OR p_status NOT IN ('pending', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'สถานะตรวจงานไม่ถูกต้อง';
  END IF;

  SELECT team_id, quest_id INTO target_team_id, target_quest_id
  FROM public.submissions
  WHERE id = p_submission_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ไม่พบงานส่ง';
  END IF;

  UPDATE public.submissions
  SET status = p_status,
      reviewer_note = p_feedback,
      reviewed_at = CASE WHEN p_status = 'pending' THEN NULL ELSE now() END
  WHERE id = p_submission_id;

  INSERT INTO public.quest_progress (team_id, quest_id, status, cleared_at)
  VALUES (
    target_team_id,
    target_quest_id,
    CASE WHEN p_status = 'approved' THEN 'cleared' ELSE p_status END,
    CASE WHEN p_status = 'approved' THEN now() ELSE NULL END
  )
  ON CONFLICT (team_id, quest_id)
  DO UPDATE SET status = EXCLUDED.status, cleared_at = EXCLUDED.cleared_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_questcraft_leaderboard()
RETURNS TABLE (
  team_id bigint,
  cleared integer,
  last_cleared_at timestamptz,
  pending_quest_no integer,
  last_submitted_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.current_questcraft_user_id() IS NULL AND NOT public.is_questcraft_teacher() THEN
    RAISE EXCEPTION 'กรุณาเข้าสู่ระบบ';
  END IF;

  RETURN QUERY
  SELECT
    team.id,
    COALESCE(progress.cleared, 0)::integer,
    progress.last_cleared_at,
    submissions.pending_quest_no,
    submissions.last_submitted_at
  FROM public.teams AS team
  LEFT JOIN LATERAL (
    SELECT
      count(*) FILTER (WHERE item.status = 'cleared')::integer AS cleared,
      max(item.cleared_at) FILTER (WHERE item.status = 'cleared') AS last_cleared_at
    FROM public.quest_progress AS item
    WHERE item.team_id = team.id
  ) AS progress ON true
  LEFT JOIN LATERAL (
    SELECT
      (max(quest.no) FILTER (WHERE submission.status = 'pending'))::integer AS pending_quest_no,
      max(submission.submitted_at) AS last_submitted_at
    FROM public.submissions AS submission
    LEFT JOIN public.quests AS quest ON quest.id = submission.quest_id
    WHERE submission.team_id = team.id
  ) AS submissions ON true
  ORDER BY team.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_questcraft_quest(p_quest_no integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quest_id bigint;
BEGIN
  IF NOT public.is_questcraft_teacher() THEN
    RAISE EXCEPTION 'เฉพาะครูเท่านั้นที่ลบภารกิจได้';
  END IF;

  LOCK TABLE public.quests IN ACCESS EXCLUSIVE MODE;
  SELECT id INTO v_quest_id
  FROM public.quests
  WHERE no = p_quest_no
  FOR UPDATE;
  IF v_quest_id IS NULL THEN
    RAISE EXCEPTION 'ไม่พบภารกิจที่ต้องการลบ';
  END IF;

  DELETE FROM public.submissions WHERE quest_id = v_quest_id;
  DELETE FROM public.quest_progress WHERE quest_id = v_quest_id;
  DELETE FROM public.quests WHERE id = v_quest_id;

  UPDATE public.quests SET no = no + 1000000;
  WITH ordered AS (
    SELECT id, row_number() OVER (ORDER BY no) AS quest_no
    FROM public.quests
  )
  UPDATE public.quests AS quest
  SET no = ordered.quest_no::integer,
      x = 220 + (
        CASE
          WHEN ((ordered.quest_no - 1) / 5) % 2 = 0 THEN (ordered.quest_no - 1) % 5
          ELSE 4 - ((ordered.quest_no - 1) % 5)
        END
      )::integer * 360,
      y = 220 + ((ordered.quest_no - 1) / 5)::integer * 320
          + CASE WHEN ((ordered.quest_no - 1) % 5) % 2 = 0 THEN 0 ELSE 70 END
  FROM ordered
  WHERE quest.id = ordered.id;
END;
$$;

REVOKE ALL ON FUNCTION public.current_questcraft_user_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_questcraft_teacher_username() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_questcraft_team_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_questcraft_teacher() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_questcraft_quests_open(boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_questcraft_spin_state(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.register_questcraft_student(text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sign_in_questcraft_student(text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sign_in_questcraft_teacher(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_questcraft_classrooms() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_questcraft_team(text, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.join_questcraft_team(bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_questcraft_answer(integer, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_questcraft_submission(bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.review_questcraft_submission(bigint, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_questcraft_leaderboard() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_questcraft_quest(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_questcraft_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_questcraft_teacher_username() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_questcraft_team_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_questcraft_teacher() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_questcraft_quests_open(boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_questcraft_spin_state(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_questcraft_student(text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sign_in_questcraft_student(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sign_in_questcraft_teacher(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_questcraft_classrooms() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_questcraft_team(text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_questcraft_team(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_questcraft_answer(integer, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_questcraft_submission(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_questcraft_submission(bigint, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_questcraft_leaderboard() TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_questcraft_quest(integer) TO authenticated;

GRANT SELECT ON public.users, public.teams, public.quests, public.submissions,
  public.quest_progress, public.spin_history, public.admin_settings TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.teams, public.quests, public.submissions,
  public.quest_progress, public.spin_history, public.admin_settings TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.users FROM anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quest_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spin_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS questcraft_users_read ON public.users;
CREATE POLICY questcraft_users_read ON public.users
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS questcraft_teams_read ON public.teams;
CREATE POLICY questcraft_teams_read ON public.teams
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS questcraft_teams_create ON public.teams;
CREATE POLICY questcraft_teams_create ON public.teams
  FOR INSERT TO authenticated
  WITH CHECK (creator_id = public.current_questcraft_user_id());
DROP POLICY IF EXISTS questcraft_teams_update ON public.teams;
CREATE POLICY questcraft_teams_update ON public.teams
  FOR UPDATE TO authenticated
  USING (creator_id = public.current_questcraft_user_id() OR public.is_questcraft_teacher())
  WITH CHECK (creator_id = public.current_questcraft_user_id() OR public.is_questcraft_teacher());
DROP POLICY IF EXISTS questcraft_teams_delete ON public.teams;
CREATE POLICY questcraft_teams_delete ON public.teams
  FOR DELETE TO authenticated
  USING (creator_id = public.current_questcraft_user_id() OR public.is_questcraft_teacher());

DROP POLICY IF EXISTS questcraft_quests_read ON public.quests;
CREATE POLICY questcraft_quests_read ON public.quests
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS questcraft_quests_teacher_write ON public.quests;
CREATE POLICY questcraft_quests_teacher_write ON public.quests
  FOR ALL TO authenticated
  USING (public.is_questcraft_teacher())
  WITH CHECK (public.is_questcraft_teacher());

DROP POLICY IF EXISTS questcraft_submissions_read ON public.submissions;
CREATE POLICY questcraft_submissions_read ON public.submissions
  FOR SELECT TO authenticated
  USING (team_id = public.current_questcraft_team_id() OR public.is_questcraft_teacher());
DROP POLICY IF EXISTS questcraft_submissions_create ON public.submissions;
CREATE POLICY questcraft_submissions_create ON public.submissions
  FOR INSERT TO authenticated
  WITH CHECK (team_id = public.current_questcraft_team_id());
DROP POLICY IF EXISTS questcraft_submissions_teacher_update ON public.submissions;
CREATE POLICY questcraft_submissions_teacher_update ON public.submissions
  FOR UPDATE TO authenticated
  USING (public.is_questcraft_teacher())
  WITH CHECK (public.is_questcraft_teacher());

DROP POLICY IF EXISTS questcraft_progress_read ON public.quest_progress;
CREATE POLICY questcraft_progress_read ON public.quest_progress
  FOR SELECT TO authenticated
  USING (team_id = public.current_questcraft_team_id() OR public.is_questcraft_teacher());
DROP POLICY IF EXISTS questcraft_progress_teacher_write ON public.quest_progress;
CREATE POLICY questcraft_progress_teacher_write ON public.quest_progress
  FOR ALL TO authenticated
  USING (public.is_questcraft_teacher())
  WITH CHECK (public.is_questcraft_teacher());

DROP POLICY IF EXISTS questcraft_spin_read ON public.spin_history;
CREATE POLICY questcraft_spin_read ON public.spin_history
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS questcraft_spin_teacher_write ON public.spin_history;
CREATE POLICY questcraft_spin_teacher_write ON public.spin_history
  FOR ALL TO authenticated
  USING (public.is_questcraft_teacher())
  WITH CHECK (public.is_questcraft_teacher());

DROP POLICY IF EXISTS questcraft_settings_read ON public.admin_settings;
CREATE POLICY questcraft_settings_read ON public.admin_settings
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS questcraft_settings_teacher_write ON public.admin_settings;
CREATE POLICY questcraft_settings_teacher_write ON public.admin_settings
  FOR ALL TO authenticated
  USING (public.is_questcraft_teacher())
  WITH CHECK (public.is_questcraft_teacher());

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'quest-submissions',
  'quest-submissions',
  false,
  104857600,
  ARRAY[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'video/mp4',
    'video/quicktime',
    'application/zip',
    'application/x-zip-compressed',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 104857600,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS questcraft_submission_files_read ON storage.objects;
CREATE POLICY questcraft_submission_files_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'quest-submissions'
    AND (
      (storage.foldername(name))[1] = public.current_questcraft_team_id()::text
      OR (storage.foldername(name))[1] = 'examples'
      OR public.is_questcraft_teacher()
    )
  );
DROP POLICY IF EXISTS questcraft_submission_files_create ON storage.objects;
CREATE POLICY questcraft_submission_files_create ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'quest-submissions'
    AND (
      (storage.foldername(name))[1] = public.current_questcraft_team_id()::text
      OR (
        (storage.foldername(name))[1] = 'examples'
        AND public.is_questcraft_teacher()
      )
    )
  );
DROP POLICY IF EXISTS questcraft_submission_files_delete ON storage.objects;
CREATE POLICY questcraft_submission_files_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'quest-submissions'
    AND (
      owner_id::text = auth.uid()::text
      OR (storage.foldername(name))[1] = public.current_questcraft_team_id()::text
      OR public.is_questcraft_teacher()
    )
  );

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    RAISE EXCEPTION 'ต้องเปิด Supabase Realtime publication ก่อนซิงก์วงล้อ';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'admin_settings'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_settings';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'submissions'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.submissions';
  END IF;
END;
$$;

-- Create a teacher account from SQL Editor; choose a username and replace the password:
-- INSERT INTO public.questcraft_teacher_accounts (username, password_hash)
-- VALUES (
--   lower(trim('YOUR_USERNAME')),
--   extensions.crypt('YOUR_PASSWORD', extensions.gen_salt('bf'))
-- );

NOTIFY pgrst, 'reload schema';
