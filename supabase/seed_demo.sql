-- Questcraft demo data reset and seed.
-- Run in Supabase Dashboard > SQL Editor. Re-running replaces these seven
-- application tables with the same demo dataset. Supabase Auth users are not
-- created here; the profile password_hash values are intentionally unusable.

BEGIN;

UPDATE public.users SET team_id = NULL;
DELETE FROM public.submissions;
DELETE FROM public.quest_progress;
DELETE FROM public.spin_history;
DELETE FROM public.teams;
DELETE FROM public.users;
DELETE FROM public.quests;
DELETE FROM public.admin_settings;

INSERT INTO public.users (first_name, last_name, classroom, number, password_hash, team_id, created_at) VALUES
  ('ภูมิ', 'ศรีวงศ์', 'ม.5/2', '12', '!seeded-profile-no-login!', NULL, now()),
  ('ณิชา', 'ทองดี', 'ม.5/2', '18', '!seeded-profile-no-login!', NULL, now()),
  ('ธนกร', 'แสงทอง', 'ม.5/2', '3', '!seeded-profile-no-login!', NULL, now()),
  ('ปาลิตา', 'มีสุข', 'ม.5/2', '25', '!seeded-profile-no-login!', NULL, now()),
  ('กันต์', 'วิริยะ', 'ม.5/2', '7', '!seeded-profile-no-login!', NULL, now()),
  ('พิมพ์ชนก', 'ใจดี', 'ม.5/2', '21', '!seeded-profile-no-login!', NULL, now()),
  ('อชิระ', 'บุญมา', 'ม.5/2', '1', '!seeded-profile-no-login!', NULL, now()),
  ('เมษา', 'รัตนา', 'ม.5/2', '30', '!seeded-profile-no-login!', NULL, now()),
  ('ศุภกร', 'นาคสุข', 'ม.5/2', '15', '!seeded-profile-no-login!', NULL, now()),
  ('ปริญญ์', 'เกษม', 'ม.5/2', '9', '!seeded-profile-no-login!', NULL, now()),
  ('ลลิล', 'ศรีสุข', 'ม.5/2', '27', '!seeded-profile-no-login!', NULL, now()),
  ('ภัทร', 'อินทร์แก้ว', 'ม.5/2', '16', '!seeded-profile-no-login!', NULL, now()),
  ('ไอริณ', 'พรหมมา', 'ม.5/2', '31', '!seeded-profile-no-login!', NULL, now()),
  ('ก้อง', 'สายทอง', 'ม.5/2', '5', '!seeded-profile-no-login!', NULL, now()),
  ('ชยพล', 'คำแก้ว', 'ม.5/2', '4', '!seeded-profile-no-login!', NULL, now()),
  ('วรินทร์', 'ศักดิ์ดี', 'ม.5/2', '33', '!seeded-profile-no-login!', NULL, now()),
  ('ธีรภัทร', 'ทองคำ', 'ม.5/2', '11', '!seeded-profile-no-login!', NULL, now()),
  ('นภัส', 'ใจงาม', 'ม.5/2', '20', '!seeded-profile-no-login!', NULL, now());

INSERT INTO public.teams (name, cover, creator_id, created_at) VALUES
  ('มังกรเขียว Studio', 'dragon', (SELECT id FROM public.users WHERE classroom = 'ม.5/2' AND number = '12'), now()),
  ('Orbit Kids', 'space', (SELECT id FROM public.users WHERE classroom = 'ม.5/2' AND number = '7'), now()),
  ('วิหารรูน', 'forest', (SELECT id FROM public.users WHERE classroom = 'ม.5/2' AND number = '9'), now()),
  ('Neon Cat', 'city', (SELECT id FROM public.users WHERE classroom = 'ม.5/2' AND number = '31'), now()),
  ('Pixel ข้าวเหนียว', 'dragon', (SELECT id FROM public.users WHERE classroom = 'ม.5/2' AND number = '4'), now()),
  ('ทีมไม่นอน', 'space', (SELECT id FROM public.users WHERE classroom = 'ม.5/2' AND number = '33'), now());

WITH team_members(team_name, numbers) AS (
  VALUES
    ('มังกรเขียว Studio', ARRAY['12', '18', '3', '25']::text[]),
    ('Orbit Kids', ARRAY['7', '21', '1', '30', '15']::text[]),
    ('วิหารรูน', ARRAY['9', '27', '16']::text[]),
    ('Neon Cat', ARRAY['31', '5']::text[]),
    ('Pixel ข้าวเหนียว', ARRAY['4']::text[]),
    ('ทีมไม่นอน', ARRAY['33', '11', '20']::text[])
)
UPDATE public.users AS u
SET team_id = t.id
FROM team_members AS m
JOIN public.teams AS t ON t.name = m.team_name
WHERE u.classroom = 'ม.5/2'
  AND u.number = ANY(m.numbers);

INSERT INTO public.quests (no, title, description, x, y, is_active, created_at) VALUES
  (1, 'ตั้งชื่อเกมและแนวเกม', 'คิดชื่อเกม เลือกแนว และเขียนประโยคเดียวที่อธิบายว่าผู้เล่นทำอะไรในเกม', 260, 900, true, now()),
  (2, 'ออกแบบตัวละครหลัก', 'วาดตัวละครหลักอย่างน้อย 1 ตัว พร้อมท่ายืนและท่าเดิน ส่งเป็นภาพ PNG หรือ PDF', 620, 720, true, now()),
  (3, 'ร่างแผนที่ด่านแรก', 'สเก็ตช์แผนผังด่านแรก ระบุจุดเริ่ม จุดจบ และอุปสรรคอย่างน้อย 3 จุด', 980, 940, true, now()),
  (4, 'กลไกการเล่นหลัก', 'อธิบายกลไกหลัก 1 อย่างที่ทำให้เกมสนุก พร้อมกฎการได้คะแนนและการแพ้', 1340, 760, true, now()),
  (5, 'ต้นแบบที่เล่นได้', 'สร้างต้นแบบที่ตัวละครขยับได้ แล้วส่งลิงก์ให้ครูลองเล่น', 1700, 520, true, now()),
  (6, 'เสียงและดนตรีประกอบ', 'ใส่เสียงประกอบอย่างน้อย 3 เสียง แล้วอัดคลิปการเล่นสั้น ๆ ไม่เกิน 1 นาที', 1460, 300, true, now()),
  (7, 'ทดสอบกับเพื่อน', 'ให้เพื่อนต่างทีม 3 คนลองเล่น บันทึกความเห็นและสิ่งที่จะแก้ไข', 1080, 180, true, now()),
  (8, 'เกมฉบับสมบูรณ์', 'ส่งลิงก์เกมฉบับสมบูรณ์ พร้อมหน้าปกและวิธีเล่น เตรียมพรีเซนต์หน้าชั้น', 700, 260, true, now());

INSERT INTO public.submissions (team_id, quest_id, answer, status, submitted_at, reviewed_at, reviewer_note) VALUES
  ((SELECT id FROM public.teams WHERE name = 'มังกรเขียว Studio'), (SELECT id FROM public.quests WHERE no = 6), '{"kind":"file","name":"มังกรเขียว_เสียงประกอบ.mp4","size":"18.4 MB","preview":"https://cdn.magicpatterns.com/patterns/generated-images/eebf3cca-9074-49cb-909d-793c17f0d074.jpg","video":true}', 'pending', now() - interval '20 minutes', NULL, NULL),
  ((SELECT id FROM public.teams WHERE name = 'วิหารรูน'), (SELECT id FROM public.quests WHERE no = 4), '{"kind":"text","body":"ผู้เล่นเป็นนักเวทที่ต้องจุดรูนให้ครบ 4 ดวงก่อนแสงหมด ทุกครั้งที่จุดรูนได้ +100 คะแนน และได้เวลาเพิ่ม 10 วินาที ถ้าแตะเงามืด 3 ครั้งหรือแสงหมดจะแพ้ทันที"}', 'pending', now() - interval '42 minutes', NULL, NULL),
  ((SELECT id FROM public.teams WHERE name = 'ทีมไม่นอน'), (SELECT id FROM public.quests WHERE no = 1), '{"kind":"text","body":"ชื่อเกม: ตื่นก่อนแปดโมง แนว Puzzle — ผู้เล่นต้องพานักเรียนง่วงนอนไปถึงห้องเรียนก่อนออดดัง โดยเลี่ยงครูเวรและสุนัขในโรงเรียน"}', 'pending', now() - interval '5 hours', NULL, NULL),
  ((SELECT id FROM public.teams WHERE name = 'Orbit Kids'), (SELECT id FROM public.quests WHERE no = 5), '{"kind":"link","url":"https://scratch.mit.edu/projects/914233871","note":"กดลูกศรซ้ายขวาเพื่อบังคับยาน"}', 'approved', now() - interval '2 hours', now() - interval '90 minutes', 'ยานขยับลื่นดีมาก ลองเพิ่มอุกกาบาตในด่านถัดไปนะ'),
  ((SELECT id FROM public.teams WHERE name = 'Neon Cat'), (SELECT id FROM public.quests WHERE no = 3), '{"kind":"file","name":"neoncat_map_v1.png","size":"2.1 MB","preview":"https://cdn.magicpatterns.com/patterns/generated-images/91a9d7bd-aa6c-4ff6-b86a-198485ec1a12.jpg"}', 'rejected', now() - interval '1 day', now() - interval '22 hours', 'ยังไม่ระบุจุดเริ่มและจุดจบ ช่วยเพิ่มแล้วส่งใหม่อีกครั้ง');

WITH progress_seed(team_name, quest_no, status, cleared_at) AS (
  VALUES
    ('มังกรเขียว Studio', 1, 'cleared', now() - interval '3 days'),
    ('มังกรเขียว Studio', 2, 'cleared', now() - interval '2 days'),
    ('มังกรเขียว Studio', 3, 'cleared', now() - interval '2 days'),
    ('มังกรเขียว Studio', 4, 'cleared', now() - interval '1 day'),
    ('มังกรเขียว Studio', 5, 'cleared', now() - interval '1 day'),
    ('มังกรเขียว Studio', 6, 'pending', NULL::timestamptz),
    ('Orbit Kids', 1, 'cleared', now() - interval '3 days'),
    ('Orbit Kids', 2, 'cleared', now() - interval '2 days'),
    ('Orbit Kids', 3, 'cleared', now() - interval '2 days'),
    ('Orbit Kids', 4, 'cleared', now() - interval '1 day'),
    ('Orbit Kids', 5, 'cleared', now() - interval '90 minutes'),
    ('วิหารรูน', 1, 'cleared', now() - interval '3 days'),
    ('วิหารรูน', 2, 'cleared', now() - interval '2 days'),
    ('วิหารรูน', 3, 'cleared', now() - interval '1 day'),
    ('วิหารรูน', 4, 'pending', NULL::timestamptz),
    ('Neon Cat', 1, 'cleared', now() - interval '3 days'),
    ('Neon Cat', 2, 'cleared', now() - interval '2 days'),
    ('Neon Cat', 3, 'rejected', NULL::timestamptz),
    ('Pixel ข้าวเหนียว', 1, 'cleared', now() - interval '3 days'),
    ('ทีมไม่นอน', 1, 'pending', NULL::timestamptz)
)
INSERT INTO public.quest_progress (team_id, quest_id, status, cleared_at)
SELECT t.id, q.id, p.status, p.cleared_at
FROM progress_seed AS p
JOIN public.teams AS t ON t.name = p.team_name
JOIN public.quests AS q ON q.no = p.quest_no;

INSERT INTO public.admin_settings (key, value, updated_at) VALUES
  ('quests_open', 'true'::jsonb, now()),
  ('seed_version', '"questcraft-demo-v1"'::jsonb, now());

COMMIT;

SELECT 'users' AS table_name, count(*) AS rows FROM public.users
UNION ALL SELECT 'teams', count(*) FROM public.teams
UNION ALL SELECT 'quests', count(*) FROM public.quests
UNION ALL SELECT 'submissions', count(*) FROM public.submissions
UNION ALL SELECT 'quest_progress', count(*) FROM public.quest_progress
UNION ALL SELECT 'spin_history', count(*) FROM public.spin_history
UNION ALL SELECT 'admin_settings', count(*) FROM public.admin_settings;
