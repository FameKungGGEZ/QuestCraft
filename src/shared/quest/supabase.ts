import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { compareClassrooms, normalizeClassroom } from './classrooms'
import { COVERS, CoverKey, Quest, SpinState, Team } from './data'
import { layoutQuests, QuestDraft } from './questStore'
import { getSubmissionFileContentType } from './submissionFiles'
import { decodeSubmissionAnswer, parseSubmissionAnswer } from './submissions'
import type { AnswerDraft, Submission, SubmissionAnswer, SubmissionStatus } from './submissions'

export type UserProfile = {
  id: number
  auth_user_id: string | null
  first_name: string
  last_name: string
  classroom: string
  number: string
  team_id: number | null
  role: 'student' | 'teacher'
}

type UserRow = Omit<UserProfile, 'role'> & { role: string }

type TeamRow = {
  id: number
  name: string
  cover: string
  creator_id: number
  capacity: number
  created_at: string
}

type QuestRow = {
  id: number
  no: number
  title: string
  description: string
  x: number
  y: number
  is_active: boolean
  accepts: string[]
  file_types: string[]
  example: Quest['example'] | null
}

type ProgressRow = {
  team_id: number
  quest_id: number
  status: string
  cleared_at: string | null
}

type SubmissionRow = {
  id: number
  team_id: number
  quest_id: number
  answer: unknown
  status: string
  submitted_at: string
  reviewed_at: string | null
  reviewer_note: string | null
  submitted_by_user_id?: number | null
}

type SettingRow = {
  key: string
  value: unknown
}

type LeaderboardRow = {
  team_id: number
  cleared: number
  last_cleared_at: string | null
  pending_quest_no: number | null
  last_submitted_at: string | null
}

export type QuestcraftData = {
  users: UserProfile[]
  teams: Team[]
  quests: Quest[]
  progress: ProgressRow[]
  submissions: Submission[]
  rawSubmissions: SubmissionRow[]
  questsOpen: boolean
  spinState: SpinState
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
let client: SupabaseClient | null = null

export function getSupabase() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('กำหนด VITE_SUPABASE_URL และ VITE_SUPABASE_PUBLISHABLE_KEY ใน .env.local ก่อน')
  }
  if (!client) client = createClient(supabaseUrl, supabaseKey)
  return client
}

export async function loadProfile(): Promise<UserProfile> {
  const db = getSupabase()
  const { data: userId, error: userIdError } = await db.rpc('current_questcraft_user_id')
  if (userIdError) throw userIdError
  if (userId === null || !Number.isSafeInteger(Number(userId))) {
    const { data: username, error: usernameError } = await db.rpc('current_questcraft_teacher_username')
    if (usernameError) throw usernameError
    if (typeof username === 'string' && username.trim()) {
      return {
        id: 0,
        auth_user_id: null,
        first_name: username,
        last_name: '',
        classroom: '',
        number: '',
        team_id: null,
        role: 'teacher',
      }
    }
    throw new Error('ไม่พบโปรไฟล์ผู้ใช้')
  }
  const { data, error } = await db
    .from('users')
    .select('id,auth_user_id,first_name,last_name,classroom,number,team_id,role')
    .eq('id', Number(userId))
    .single()
  if (error) throw error
  return parseUser(data as UserRow)
}

export async function loadQuestcraftData(): Promise<QuestcraftData> {
  const db = getSupabase()
  const [userResult, teamResult, questResult, progressResult, submissionResult, settingsResult, leaderboardResult] =
    await Promise.all([
      db.from('users').select('id,auth_user_id,first_name,last_name,classroom,number,team_id,role'),
      db.from('teams').select('id,name,cover,creator_id,capacity,created_at'),
      db
        .from('quests')
        .select('id,no,title,description,x,y,is_active,accepts,file_types,example')
        .eq('is_active', true)
        .order('no'),
      db.from('quest_progress').select('team_id,quest_id,status,cleared_at'),
      db
        .from('submissions')
        .select('id,team_id,quest_id,answer,status,submitted_at,reviewed_at,reviewer_note,submitted_by_user_id')
        .order('submitted_at', { ascending: false }),
      db.from('admin_settings').select('key,value'),
      db.rpc('list_questcraft_leaderboard'),
    ])

  if (leaderboardResult.error?.code === 'PGRST202') {
    throw new Error('Supabase ยังไม่พบ RPC อันดับทีม ให้รัน supabase/connect_app.sql ฉบับล่าสุดใน SQL Editor')
  }
  for (const result of [userResult, teamResult, questResult, progressResult, submissionResult, settingsResult, leaderboardResult]) {
    if (result.error) throw result.error
  }

  const users = (userResult.data ?? []).map((row) => parseUser(row as UserRow))
  const teamRows = (teamResult.data ?? []) as TeamRow[]
  const questRows = (questResult.data ?? []) as QuestRow[]
  const progress = (progressResult.data ?? []) as ProgressRow[]
  const rawSubmissions = (submissionResult.data ?? []) as SubmissionRow[]
  const leaderboard = (leaderboardResult.data ?? []) as LeaderboardRow[]
  const quests = await Promise.all(questRows.map(async (row) => {
    const quest = parseQuest(row)
    if (!quest.example?.storagePath) return quest
    const { data, error } = await db.storage.from('quest-submissions').createSignedUrl(quest.example.storagePath, 3600)
    if (error) throw error
    return { ...quest, example: { ...quest.example, src: data.signedUrl } }
  }))
  const submissions = await Promise.all(
    rawSubmissions.map(async (row) => {
      const submission = parseSubmission(row, users, questRows)
      const answer = submission.answer
      if (answer.kind !== 'file' || !answer.storagePath) return submission
      const { data, error } = await db.storage.from('quest-submissions').createSignedUrl(answer.storagePath, 3600)
      if (error) {
        return {
          ...submission,
          answer: { ...answer, accessError: error.message },
        }
      }
      return {
        ...submission,
        answer: {
          ...answer,
          url: data.signedUrl,
          preview: answer.contentType?.startsWith('image/') ? data.signedUrl : answer.preview,
        },
      }
    })
  )
  const teams = teamRows.map((row) => parseTeam(row, users, leaderboard))
  const settings = (settingsResult.data ?? []) as SettingRow[]
  const questsSetting = parseJsonValue(settings.find((setting) => setting.key === 'quests_open')?.value)
  const spinSetting = parseJsonValue(settings.find((setting) => setting.key === 'spin_state')?.value)
  const spinState = parseSpinState(spinSetting, new Set(teamRows.map((row) => String(row.id))))

  return {
    users,
    teams,
    quests,
    progress,
    submissions,
    rawSubmissions,
    questsOpen: questsSetting === true,
    spinState,
  }
}

export async function registerStudent(values: {
  firstName: string
  lastName: string
  classroom: string
  number: string
  password: string
}) {
  const classroom = normalizeClassroom(values.classroom)
  const number = values.number.trim()
  if (!/^\d+$/.test(number)) throw new Error('เลขที่ต้องเป็นตัวเลข')
  const session = await ensureAnonymousSession()
  const { error } = await getSupabase().rpc('register_questcraft_student', {
    p_first_name: values.firstName.trim(),
    p_last_name: values.lastName.trim(),
    p_classroom: classroom,
    p_number: number,
    p_password: values.password,
  })
  if (error) throw error
  return { session }
}

export async function signIn(classroom: string, number: string, password: string) {
  const normalizedClassroom = normalizeClassroom(classroom)
  const normalizedNumber = number.trim()
  if (!/^\d+$/.test(normalizedNumber)) throw new Error('เลขที่ต้องเป็นตัวเลข')
  const session = await ensureAnonymousSession()
  const { error } = await getSupabase().rpc('sign_in_questcraft_student', {
    p_classroom: normalizedClassroom,
    p_number: normalizedNumber,
    p_password: password,
  })
  if (error) throw error
  return { session }
}

export async function signInTeacher(username: string, password: string) {
  const session = await ensureAnonymousSession()
  const { error } = await getSupabase().rpc('sign_in_questcraft_teacher', {
    p_username: username.trim(),
    p_password: password,
  })
  if (error) throw error
  return { session }
}

async function ensureAnonymousSession() {
  const auth = getSupabase().auth
  const { data: current, error: currentError } = await auth.getSession()
  if (currentError) throw currentError
  if (current.session?.user.is_anonymous) return current.session

  const { data, error } = await auth.signInAnonymously()
  if (error) {
    if (error.message.toLowerCase().includes('anonymous sign-ins are disabled')) {
      throw new Error('ต้องเปิด Anonymous Sign-Ins ใน Supabase Auth ก่อนจึงจะสมัคร/เข้าสู่ระบบนักเรียนได้')
    }
    throw error
  }
  if (!data.session) throw new Error('Supabase ไม่ได้สร้างเซสชันนักเรียน')
  return data.session
}

export async function listRegisteredClassrooms() {
  const { data, error } = await getSupabase().rpc('list_questcraft_classrooms')
  if (error) throw error
  return [...new Set((data ?? []).map((row: { classroom: string }) => row.classroom.trim()).filter(Boolean))]
    .sort(compareClassrooms)
}

export async function signOut() {
  const { error } = await getSupabase().auth.signOut()
  if (error) throw error
}

export async function createTeam(name: string, cover: CoverKey, capacity: number) {
  const { data, error } = await getSupabase().rpc('create_questcraft_team', {
    p_name: name,
    p_cover: cover,
    p_capacity: capacity,
  })
  if (error) throw error
  return Number(data)
}

export async function setMyTeam(teamId: string | null) {
  const id = teamId === null ? null : Number(teamId)
  if (id !== null && !Number.isSafeInteger(id)) throw new Error('รหัสทีมไม่ถูกต้อง')
  const { error } = await getSupabase().rpc('join_questcraft_team', { p_team_id: id })
  if (error) throw error
}

export async function updateTeam(teamId: string, values: { name: string; cover: CoverKey; capacity: number }) {
  const { error } = await getSupabase()
    .from('teams')
    .update({ name: values.name.trim(), cover: values.cover, capacity: values.capacity })
    .eq('id', Number(teamId))
  if (error) throw error
}

export async function disbandTeam(): Promise<string | null> {
  const db = getSupabase()
  const { data, error } = await db.rpc('disband_questcraft_team')
  if (error?.code === 'PGRST202') {
    throw new Error('Supabase ยังไม่พบ RPC ยุบทีม ให้รัน supabase/connect_app.sql ฉบับล่าสุดใน SQL Editor')
  }
  if (error) throw error

  const paths = Array.isArray(data) ? data.filter((path): path is string => typeof path === 'string') : []
  if (paths.length > 0) {
    const { error: storageError } = await db.storage.from('quest-submissions').remove(paths)
    if (storageError) return `ยุบทีมแล้ว แต่ลบไฟล์งานส่งไม่สำเร็จ: ${storageError.message}`
  }
  return null
}

export async function submitAnswer(
  profile: UserProfile,
  questNo: number,
  draft: AnswerDraft
) {
  if (profile.team_id === null) throw new Error('ต้องเข้าทีมก่อนส่งภารกิจ')
  const db = getSupabase()
  const answer: SubmissionAnswer = draft.kind === 'file-upload'
    ? await uploadSubmissionFile(db, profile.team_id, draft.file)
    : draft
  const { error } = await db.rpc('submit_questcraft_answer', {
    p_quest_no: questNo,
    p_answer: answer,
  })
  if (error) {
    if (answer.kind === 'file' && answer.storagePath) {
      const { error: cleanupError } = await db.storage.from('quest-submissions').remove([answer.storagePath])
      if (cleanupError) {
        throw new Error(`ส่งภารกิจไม่สำเร็จ และลบไฟล์ที่อัปโหลดไม่สำเร็จ: ${cleanupError.message}`)
      }
    }
    throw error
  }
}

export async function cancelSubmission(id: string): Promise<string | null> {
  const numericId = Number(id)
  if (!Number.isSafeInteger(numericId)) throw new Error('รหัสงานส่งไม่ถูกต้อง')
  const { data: answer, error } = await getSupabase().rpc('cancel_questcraft_submission', {
    p_submission_id: numericId,
  })
  if (error?.code === 'PGRST202') {
    throw new Error('Supabase ยังไม่พบ RPC ยกเลิกงานส่ง ให้รัน supabase/connect_app.sql ฉบับล่าสุดใน SQL Editor')
  }
  if (error) throw error

  const storagePath = submissionStoragePath(answer)
  if (storagePath) {
    const { error: storageError } = await getSupabase().storage.from('quest-submissions').remove([storagePath])
    if (storageError) return `ยกเลิกการส่งแล้ว แต่ลบไฟล์แนบไม่สำเร็จ: ${storageError.message}`
  }
  return null
}

async function uploadSubmissionFile(db: SupabaseClient, teamId: number, file: File): Promise<SubmissionAnswer> {
  const contentType = getSubmissionFileContentType(file.name)
  if (!contentType) throw new Error('รองรับไฟล์ PNG, JPG, PDF, MP4, MOV, DOCX และ ZIP เท่านั้น')
  const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, '_') || 'submission'
  const storagePath = `${teamId}/${crypto.randomUUID()}-${safeName}`
  const { error } = await db.storage.from('quest-submissions').upload(storagePath, file, {
    contentType,
    upsert: false,
  })
  if (error) throw error
  return {
    kind: 'file',
    name: file.name,
    size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
    storagePath,
    contentType,
    video: contentType.startsWith('video/'),
  }
}

async function uploadQuestExample(
  db: SupabaseClient,
  file: File,
  caption: string
): Promise<NonNullable<Quest['example']>> {
  const contentType = getSubmissionFileContentType(file.name)
  if (!contentType || (!contentType.startsWith('image/') && !contentType.startsWith('video/'))) {
    throw new Error('รองรับภาพ PNG/JPG และวิดีโอ MP4/MOV เท่านั้น')
  }
  if (file.size > 100 * 1024 * 1024) throw new Error('ไฟล์ตัวอย่างต้องมีขนาดไม่เกิน 100 MB')

  const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, '_') || 'example'
  const storagePath = `examples/${crypto.randomUUID()}-${safeName}`
  const { error } = await db.storage.from('quest-submissions').upload(storagePath, file, {
    contentType,
    upsert: false,
  })
  if (error) throw error

  return {
    kind: contentType.startsWith('video/') ? 'video' : 'image',
    src: '',
    caption,
    storagePath,
  }
}

export async function reviewSubmission(id: string, status: SubmissionStatus, feedback?: string) {
  const numericId = Number(id)
  if (!Number.isSafeInteger(numericId)) throw new Error('รหัสงานส่งไม่ถูกต้อง')
  const { error } = await getSupabase().rpc('review_questcraft_submission', {
    p_submission_id: numericId,
    p_status: status,
    p_feedback: feedback ?? null,
  })
  if (error) throw error
}

export async function saveQuest(quest: QuestDraft, no?: number) {
  const { exampleFile, ...questValues } = quest
  const payload = {
    title: questValues.title,
    description: questValues.detail,
    accepts: questValues.accepts,
    file_types: questValues.fileTypes ?? [],
    example: questValues.example ?? null,
    is_active: true,
  }
  const db = getSupabase()
  let uploadedPath: string | null = null
  try {
    if (exampleFile) {
      const example = await uploadQuestExample(db, exampleFile, questValues.example?.caption ?? '')
      uploadedPath = example.storagePath ?? null
      payload.example = example
    }

    if (no === undefined) {
      const newNo = await nextQuestNumber()
      const placeholders = Array.from({ length: newNo - 1 }, (_, index) => ({
        no: index + 1,
        title: '',
        detail: '',
        accepts: [] as Quest['accepts'],
      }))
      const positions = layoutQuests([...placeholders, { ...questValues, no: newNo }])
      const position = positions[positions.length - 1]
      if (!position) throw new Error('ไม่สามารถจัดตำแหน่งภารกิจใหม่ได้')
      const { error } = await db.from('quests').insert({
        ...payload,
        no: newNo,
        x: position.x,
        y: position.y,
      })
      if (error) throw error
    } else {
      const { data, error } = await db.from('quests').update(payload).eq('no', no).select('no').maybeSingle()
      if (error) throw error
      if (!data) throw new Error('ไม่พบภารกิจที่ต้องการแก้ไข')
    }
  } catch (error) {
    if (uploadedPath) {
      const { error: cleanupError } = await db.storage.from('quest-submissions').remove([uploadedPath])
      if (cleanupError) {
        throw new Error(`บันทึกภารกิจไม่สำเร็จ และลบไฟล์ตัวอย่างที่อัปโหลดไม่สำเร็จ: ${cleanupError.message}`)
      }
    }
    throw error
  }
}

export async function deleteQuest(no: number): Promise<string | null> {
  const db = getSupabase()
  const { data: quest, error: questError } = await db.from('quests').select('id').eq('no', no).maybeSingle()
  if (questError) throw questError
  if (!quest) throw new Error('ไม่พบภารกิจที่ต้องการลบ')

  const { data: rows, error: submissionsError } = await db
    .from('submissions')
    .select('answer')
    .eq('quest_id', quest.id)
  if (submissionsError) throw submissionsError

  const paths = [...new Set((rows ?? []).map((row) => submissionStoragePath(row.answer)).filter(isString))]
  const { error } = await db.rpc('delete_questcraft_quest', { p_quest_no: no })
  if (error?.code === 'PGRST202') {
    throw new Error('Supabase ยังไม่พบ RPC ลบภารกิจ ให้รัน supabase/connect_app.sql ฉบับล่าสุดใน SQL Editor')
  }
  if (error) throw error

  if (paths.length > 0) {
    const { error: storageError } = await db.storage.from('quest-submissions').remove(paths)
    if (storageError) return `ลบภารกิจแล้ว แต่ลบไฟล์แนบไม่สำเร็จ: ${storageError.message}`
  }
  return null
}

export async function saveQuestsOpen(value: boolean) {
  const { error } = await getSupabase().rpc('set_questcraft_quests_open', { p_open: value })
  if (error?.code === 'PGRST202') {
    throw new Error('Supabase ยังไม่พบ RPC ตั้งค่าสถานะรับภารกิจ ให้รัน supabase/connect_app.sql ฉบับล่าสุดใน SQL Editor')
  }
  if (error) throw error
}

export async function saveSpinState(value: SpinState) {
  const { error } = await getSupabase().rpc('set_questcraft_spin_state', { p_state: value })
  if (error?.code === 'PGRST202') {
    throw new Error('Supabase ยังไม่พบ RPC บันทึกวงล้อ ให้รัน supabase/connect_app.sql ฉบับล่าสุดใน SQL Editor')
  }
  if (error) throw error
}

export function subscribeQuestcraftSettings(
  onSpinState: (state: SpinState) => void,
  onQuestsOpen: (open: boolean) => void,
  onError: (error: Error) => void
) {
  const db = getSupabase()
  const channel = db
    .channel('questcraft-settings')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'admin_settings' },
      (payload) => {
        const key = payload.eventType === 'DELETE'
          ? (payload.old as { key?: unknown }).key
          : (payload.new as SettingRow).key
        if (key === 'spin_state') {
          const value = payload.eventType === 'DELETE'
            ? null
            : parseJsonValue((payload.new as SettingRow).value)
          onSpinState(parseSpinState(value))
        } else if (key === 'quests_open') {
          const value = payload.eventType === 'DELETE'
            ? false
            : parseJsonValue((payload.new as SettingRow).value)
          onQuestsOpen(value === true)
        }
      }
    )
    .subscribe((status, error) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        onError(error ?? new Error(`การเชื่อมต่อวงล้อขัดข้อง: ${status}`))
      }
    })
  return () => {
    void db.removeChannel(channel)
  }
}

export function subscribeQuestcraftSubmissions(onChange: () => void, onError: (error: Error) => void) {
  const db = getSupabase()
  const channel = db
    .channel('questcraft-submissions')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'submissions' },
      () => onChange()
    )
    .subscribe((status, error) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        onError(error ?? new Error(`การเชื่อมต่องานส่งขัดข้อง: ${status}`))
      }
    })
  return () => {
    void db.removeChannel(channel)
  }
}

async function nextQuestNumber() {
  const { data, error } = await getSupabase().from('quests').select('no').order('no', { ascending: false }).limit(1)
  if (error) throw error
  return (data?.[0]?.no ?? 0) + 1
}

function parseUser(row: UserRow): UserProfile {
  if (!row.id || !row.first_name || !row.classroom) {
    throw new Error('ข้อมูลโปรไฟล์ผู้ใช้ใน Supabase ไม่ครบ')
  }
  return {
    ...row,
    role: row.role === 'teacher' ? 'teacher' : 'student',
  }
}

function parseTeam(
  row: TeamRow,
  users: UserProfile[],
  leaderboard: LeaderboardRow[]
): Team {
  const members = users.filter((user) => user.team_id === row.id)
  const owner = users.find((user) => user.id === row.creator_id)
  const summary = leaderboard.find((item) => item.team_id === row.id)
  if (!summary) throw new Error(`ไม่พบข้อมูลอันดับของทีม ${row.id} ใน Supabase`)

  return {
    id: String(row.id),
    name: row.name,
    cover: isCoverKey(row.cover) ? row.cover : 'dragon',
    owner: owner ? `${owner.first_name} ${owner.last_name}`.trim() : 'หัวหน้าทีม',
    ownerId: String(row.creator_id),
    capacity: row.capacity,
    members: members.map((member) => ({
      name: `${member.first_name} ${member.last_name}`.trim(),
      classroom: member.classroom,
      no: Number(member.number),
    })),
    cleared: summary.cleared,
    lastClearedAt: summary.last_cleared_at ?? undefined,
    pending: summary.pending_quest_no ?? undefined,
    lastSubmitAt: formatTime(summary.last_submitted_at ?? row.created_at),
  }
}

function parseQuest(row: QuestRow): Quest {
  const accepts = row.accepts.filter(
    (value): value is Quest['accepts'][number] => value === 'text' || value === 'file' || value === 'link'
  )
  if (!row.id || !row.title || accepts.length === 0) {
    throw new Error(`ข้อมูลภารกิจลำดับ ${row.no} ใน Supabase ไม่ครบ`)
  }
  return {
    no: row.no,
    title: row.title,
    detail: row.description ?? '',
    accepts,
    fileTypes: row.file_types,
    example: row.example ?? undefined,
    x: row.x,
    y: row.y,
  }
}

function parseSubmission(row: SubmissionRow, users: UserProfile[], quests: QuestRow[]): Submission {
  const answer = parseSubmissionAnswer(row.answer)
  const teamSubmitter = users.find((user) => user.id === row.submitted_by_user_id)
  const submittedBy = teamSubmitter
    ? `${teamSubmitter.first_name} ${teamSubmitter.last_name}`.trim()
    : 'สมาชิกทีม'
  const quest = quests.find((item) => item.id === row.quest_id)
  if (!quest) throw new Error(`ไม่พบภารกิจของงานส่ง ${row.id}`)
  const status = parseSubmissionStatus(row.status)

  return {
    id: String(row.id),
    teamId: String(row.team_id),
    questNo: quest.no,
    submittedBy,
    submittedAt: formatTime(row.submitted_at),
    status,
    answer: answer as Submission['answer'],
    feedback: row.reviewer_note ?? undefined,
  }
}

function parseSubmissionStatus(status: string): SubmissionStatus {
  if (status === 'pending' || status === 'approved' || status === 'rejected') return status
  throw new Error(`สถานะงานส่งไม่ถูกต้อง: ${status}`)
}

function parseSpinState(value: unknown, validTeamIds?: Set<string>): SpinState {
  const normalized = parseJsonValue(value)
  if (!normalized || typeof normalized !== 'object') return { wheel: [], done: [], winner: null }
  const state = normalized as { wheel?: unknown; done?: unknown; winner?: unknown }
  const ids = (items: unknown) =>
    Array.isArray(items)
      ? [...new Set(items.filter((id): id is string => typeof id === 'string').filter((id) => !validTeamIds || validTeamIds.has(id)))]
      : []
  const done = ids(state.done)
  const doneIds = new Set(done)
  const wheel = ids(state.wheel).filter((id) => !doneIds.has(id))
  return {
    wheel,
    done,
    winner: typeof state.winner === 'string' && wheel.includes(state.winner) ? state.winner : null,
  }
}

function parseJsonValue(value: unknown): unknown {
  let parsed = value
  for (let depth = 0; depth < 3 && typeof parsed === 'string'; depth += 1) {
    try {
      parsed = JSON.parse(parsed) as unknown
    } catch {
      break
    }
  }
  return parsed
}

function submissionStoragePath(answer: unknown): string | null {
  const parsed = decodeSubmissionAnswer(answer)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
  const value = parsed as { kind?: unknown; storagePath?: unknown }
  return value.kind === 'file' && typeof value.storagePath === 'string' ? value.storagePath : null
}

function isString(value: string | null): value is string {
  return value !== null
}

function isCoverKey(value: string): value is CoverKey {
  return Object.prototype.hasOwnProperty.call(COVERS, value)
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
}
