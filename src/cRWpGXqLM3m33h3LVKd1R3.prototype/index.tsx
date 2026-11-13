import React, { useEffect, useState } from 'react'

import Register from '../oPwFoDcd1pNygUPMG29Res.frame'
import Login from '../oCRtA4UZppHN1rqacJjeJw.frame'
import Teams from '../3R83WtEw5RGneiy7MXeT12.frame'
import QuestMap from '../gXPdASJE2hZviyWjiPHAAr.frame'
import Leaderboard from '../sJANnGichszuprF8xatWM2.frame'
import PresentSpin from '../vm8UsuEdDk7Ycd5o8aP5Qd.frame'
import AdminLogin from '../dYqZhHGFWZwSxSjQUJQJ1Q.frame'
import QuestManager from '../jZP8XU8vXTNLJHWCtkSwiq.frame'
import ReviewSubmissions from '../7tZQ9SLJ7mX7RS1tezVmc9.frame'
import AdminSettings from '../kCSDGaChprfkN9ctWi5W36.frame'
import AdminSpin from '../foiPNd2urmZmvBjRUkpUsS.frame'
import StudentDirectory from '../shared/quest/StudentDirectory'
import { useSpinState } from '../shared/quest/spin'
import type { AdminTab } from '../shared/quest/AdminShell'
import type { QuestDraft } from '../shared/quest/questStore'
import type { SpinState } from '../shared/quest/data'
import {
  createTeam,
  cancelSubmission,
  disbandTeam,
  deleteQuest,
  getSupabase,
  listRegisteredClassrooms,
  loadProfile,
  loadQuestcraftData,
  reviewSubmission,
  registerStudent,
  saveQuest,
  saveQuestsOpen,
  saveSpinState,
  subscribeQuestcraftSettings,
  subscribeQuestcraftSubmissions,
  setMyTeam,
  signIn,
  signInTeacher,
  signOut,
  submitAnswer,
  updateTeam,
} from '../shared/quest/supabase'
import type { QuestcraftData, UserProfile } from '../shared/quest/supabase'

const REGISTER = 'oPwFoDcd1pNygUPMG29Res'
const LOGIN = 'oCRtA4UZppHN1rqacJjeJw'
const TEAMS = '3R83WtEw5RGneiy7MXeT12'
const QUESTS = 'gXPdASJE2hZviyWjiPHAAr'
const LEADERBOARD = 'sJANnGichszuprF8xatWM2'
const SPIN = 'vm8UsuEdDk7Ycd5o8aP5Qd'
const ADMIN_LOGIN = 'dYqZhHGFWZwSxSjQUJQJ1Q'
const MANAGER = 'jZP8XU8vXTNLJHWCtkSwiq'
const REVIEW = '7tZQ9SLJ7mX7RS1tezVmc9'
const SETTINGS = 'kCSDGaChprfkN9ctWi5W36'
const ADMIN_SPIN = 'foiPNd2urmZmvBjRUkpUsS'
const STUDENTS = 'students'

/** Typing /admin/login (or #/admin/login) in the address bar opens the teacher login. */
const isAdminUrl = () =>
  typeof window !== 'undefined' && /\/admin\/login\/?$/.test(window.location.pathname + window.location.hash)

/** The size every frame draws at, unless one exports its own. */
export const viewport = 'web'

export const args = {
  questsOpen: true,
}

export const argTypes = {
  questsOpen: { control: 'boolean' },
}

export const folders = [
  { id: 'auth', name: 'เข้าสู่ระบบ', frames: [REGISTER, LOGIN] },
  { id: 'play', name: 'เล่น', frames: [TEAMS, QUESTS, LEADERBOARD, SPIN] },
  { id: 'teacher', name: 'ครู', frames: [ADMIN_LOGIN, MANAGER, REVIEW, ADMIN_SPIN, SETTINGS, STUDENTS] },
]

type Props = Partial<typeof args> & { start?: string }
type Tab = 'quests' | 'team' | 'leaderboard' | 'spin'
type AuthSession = { user: { id: string } } | null

export default function QuestBoard(props: Props) {
  const { questsOpen: questsArg, start } = { ...args, ...props }
  const [screen, setScreen] = useState(() => (isAdminUrl() ? ADMIN_LOGIN : start ?? REGISTER))
  const [questsOpen, setQuestsOpen] = useState(questsArg)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [appData, setAppData] = useState<QuestcraftData | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [appError, setAppError] = useState('')
  const [appNotice, setAppNotice] = useState('')
  const [spinInitialized, setSpinInitialized] = useState(false)
  const [classrooms, setClassrooms] = useState<string[]>([])
  const [classroomsError, setClassroomsError] = useState('')

  const runAction = async (action: () => Promise<void>): Promise<boolean> => {
    setAppError('')
    setAppNotice('')
    try {
      await action()
      return true
    } catch (error) {
      setAppError(getActionErrorMessage(error))
      return false
    }
  }

  const persistSpin = (value: SpinState) => {
    void runAction(async () => {
      await saveSpinState(value)
      setAppData((current) => current ? { ...current, spinState: value } : current)
    })
  }
  const spinState = useSpinState(undefined, persistSpin)

  const refreshData = async () => {
    const [nextData, nextProfile] = await Promise.all([
      loadQuestcraftData(),
      loadProfile(),
    ])
    setAppData(nextData)
    setProfile(nextProfile)
    setQuestsOpen(nextData.questsOpen)
  }

  const finishAuth = async (session: AuthSession, teacherOnly = false) => {
    if (!session) throw new Error('Supabase ไม่ได้สร้างเซสชันผู้ใช้')
    const [nextProfile, nextData] = await Promise.all([
      loadProfile(),
      loadQuestcraftData(),
    ])
    if (teacherOnly && nextProfile.role !== 'teacher') {
      await signOut()
      throw new Error('บัญชีนี้ยังไม่ได้รับสิทธิ์ครู')
    }
    setProfile(nextProfile)
    setAppData(nextData)
    setQuestsOpen(nextData.questsOpen)
    setAppError('')
    setAppNotice('')
    setSpinInitialized(false)
    setScreen(
      nextProfile.role === 'teacher'
        ? MANAGER
        : nextProfile.team_id === null
          ? TEAMS
          : nextData.questsOpen
            ? QUESTS
            : SPIN
    )
  }

  useEffect(() => {
    let active = true
    const restoreSession = async () => {
      try {
        const { data: sessionData, error } = await getSupabase().auth.getSession()
        if (error) throw error
        if (sessionData.session) {
          let nextProfile: UserProfile
          try {
            nextProfile = await loadProfile()
          } catch (error) {
            if (!sessionData.session.user.is_anonymous || !isMissingProfileError(error)) throw error
            await signOut()
            if (active) {
              setAppError('')
              setAppNotice('ล้างเซสชันเก่าที่ไม่มีโปรไฟล์แล้ว คุณสามารถสมัครหรือเข้าสู่ระบบได้')
            }
            return
          }
          const nextData = await loadQuestcraftData()
          if (!active) return
          setProfile(nextProfile)
          setAppData(nextData)
          setQuestsOpen(nextData.questsOpen)
          setScreen(
            nextProfile.role === 'teacher'
              ? MANAGER
              : nextProfile.team_id === null
                ? TEAMS
                : nextData.questsOpen
                  ? QUESTS
                  : SPIN
          )
        }
      } catch (error) {
        if (active) setAppError(error instanceof Error ? error.message : 'โหลดเซสชันไม่สำเร็จ')
      } finally {
        if (active) setAuthReady(true)
      }
    }
    void restoreSession()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const onUrl = () => isAdminUrl() && setScreen(ADMIN_LOGIN)
    window.addEventListener('hashchange', onUrl)
    window.addEventListener('popstate', onUrl)
    return () => {
      window.removeEventListener('hashchange', onUrl)
      window.removeEventListener('popstate', onUrl)
    }
  }, [])

  useEffect(() => {
    if (!profile) setQuestsOpen(questsArg)
  }, [questsArg, profile])
  useEffect(() => {
    if (!profile) return
    let active = true
    const unsubscribeSettings = subscribeQuestcraftSettings(
      (state) => {
        spinState.sync(state)
        setAppData((current) => current ? { ...current, spinState: state } : current)
        setAppError('')
      },
      (open) => {
        setQuestsOpen(open)
        setAppData((current) => current ? { ...current, questsOpen: open } : current)
      },
      (error) => setAppError(error.message)
    )
    const unsubscribeSubmissions = subscribeQuestcraftSubmissions(
      () => {
        void loadQuestcraftData()
          .then((nextData) => {
            if (!active) return
            setAppData(nextData)
            setQuestsOpen(nextData.questsOpen)
          })
          .catch((error: unknown) => {
            if (active) setAppError(error instanceof Error ? error.message : 'โหลดงานส่งไม่สำเร็จ')
          })
      },
      (error) => {
        if (active) setAppError(error.message)
      }
    )
    return () => {
      active = false
      unsubscribeSettings()
      unsubscribeSubmissions()
    }
  }, [profile?.id, spinState.sync])
  useEffect(() => {
    if (!profile || !appData || spinInitialized) return
    spinState.sync(appData.spinState)
    setSpinInitialized(true)
  }, [profile, appData, spinInitialized, spinState.sync])
  useEffect(() => {
    if (!profile) setSpinInitialized(false)
  }, [profile])

  useEffect(() => {
    if (screen !== REGISTER && screen !== LOGIN) return
    let active = true
    setClassroomsError('')
    listRegisteredClassrooms()
      .then((values) => {
        if (active) {
          setClassrooms(values)
          setClassroomsError('')
        }
      })
      .catch((error: unknown) => {
        if (active) setClassroomsError(describeClassroomLoadError(error))
      })
    return () => {
      active = false
    }
  }, [screen])

  const visibleTeams = profile ? appData?.teams ?? [] : []
  const visibleQuests = profile ? appData?.quests ?? [] : []
  const currentTeam = profile?.team_id !== null && profile
    ? appData?.teams.find((item) => item.id === String(profile.team_id))
    : undefined
  const currentTeamState = profile
    ? !currentTeam ? 'none' : currentTeam.ownerId === String(profile.id) ? 'owner' : 'member'
    : 'none'
  const currentTeamId = profile ? currentTeam?.id ?? null : null
  const selectedTeam = currentTeamId ? visibleTeams.find((item) => item.id === currentTeamId) : undefined
  const currentQuestNo = (selectedTeam?.cleared ?? 0) + 1
  const currentSubmission = appData?.submissions.find(
    (item) => item.teamId === selectedTeam?.id && item.questNo === currentQuestNo
  )
  const submission = currentSubmission?.status === 'pending'
    ? 'pending'
    : currentSubmission?.status === 'rejected'
      ? 'rejected'
      : 'none'

  useEffect(() => {
    if (!questsOpen && screen === QUESTS) setScreen(SPIN)
    if (questsOpen && screen === SPIN) setScreen(currentTeamState === 'none' ? TEAMS : QUESTS)
  }, [questsOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  const nav = (tab: Tab) => {
    if (tab === 'team') setScreen(TEAMS)
    if (tab === 'leaderboard') setScreen(LEADERBOARD)
    if (tab === 'quests') setScreen(currentTeamState === 'none' ? TEAMS : QUESTS)
    if (tab === 'spin') setScreen(SPIN)
  }
  const logout = () => {
    void runAction(async () => {
      await signOut()
      setProfile(null)
      setAppData(null)
      setSpinInitialized(false)
      setAppNotice('')
      setScreen(LOGIN)
    })
  }
  const userName = profile ? `${profile.first_name} ${profile.last_name}`.trim() : ''
  const userMeta = profile ? `${profile.classroom} · เลขที่ ${profile.number}` : ''
  const common = { onNavigate: nav, onLogout: logout, userName, userMeta }
  const submitRegister = async (values: {
    firstName: string
    lastName: string
    classroom: string
    number: string
    password: string
  }) => finishAuth((await registerStudent(values)).session)
  const submitLogin = async (values: { classroom: string; number: string; password: string }) =>
    finishAuth((await signIn(values.classroom, values.number, values.password)).session)
  const submitAdminLogin = async (values: { username: string; password: string }) =>
    finishAuth((await signInTeacher(values.username, values.password)).session, true)
  const admin = {
    questsOpen,
    teacher: profile ? `ครู${profile.first_name} ${profile.last_name}`.trim() : 'ครู',
    pendingCount: appData?.submissions.filter((item) => item.status === 'pending').length ?? 0,
    onToggleQuests: (open: boolean) => {
      void runAction(async () => {
        await saveQuestsOpen(open)
        setQuestsOpen(open)
        setAppData((current) => current ? { ...current, questsOpen: open } : current)
      })
    },
    onNavigate: (tab: AdminTab) =>
      setScreen({ quests: MANAGER, review: REVIEW, spin: ADMIN_SPIN, settings: SETTINGS, students: STUDENTS }[tab]),
    onLogout: logout,
  }

  if (!authReady) {
    return <div className="grid h-full min-h-screen place-items-center bg-ink text-muted">กำลังตรวจสอบเซสชัน…</div>
  }

  let content: React.ReactNode
  switch (screen) {
    case LOGIN:
      content = (
        <Login
          classrooms={classrooms}
          classroomsError={classroomsError}
          onSubmit={submitLogin}
          onGoRegister={() => setScreen(REGISTER)}
        />
      )
      break
    case TEAMS:
      content = (
        <Teams
          {...common}
          teams={visibleTeams}
          state={currentTeamState === 'none' ? 'no-team' : currentTeamState}
          myTeamId={currentTeamId}
          totalQuests={visibleQuests.length}
          modal="none"
          questsOpen={questsOpen}
          onCreate={(draft) => {
            void runAction(async () => {
              await createTeam(draft.name, draft.cover, draft.capacity)
              await refreshData()
            })
          }}
          onUpdate={(id, draft) => {
            void runAction(async () => {
              await updateTeam(id, draft)
              await refreshData()
            })
          }}
          onJoin={(id) => {
            void runAction(async () => {
              await setMyTeam(id)
              await refreshData()
            })
          }}
          onLeave={() => {
            void runAction(async () => {
              await setMyTeam(null)
              await refreshData()
            })
          }}
          onDisband={() => {
            void runAction(async () => {
              const warning = await disbandTeam()
              await refreshData()
              if (warning) throw new Error(warning)
            })
          }}
        />
      )
      break
    case QUESTS:
      content = (
        <QuestMap
          {...common}
          quests={visibleQuests}
          teamName={selectedTeam?.name ?? ''}
          cleared={selectedTeam?.cleared ?? 0}
          submission={submission}
          submissionData={currentSubmission}
          selected={currentQuestNo}
          onSubmitAnswer={(questNo, answer) => {
            if (!profile) return
            void runAction(async () => {
              await submitAnswer(profile, questNo, answer)
              await refreshData()
            })
          }}
          onCancelSubmission={(submissionId) =>
            runAction(async () => {
              const warning = await cancelSubmission(submissionId)
              await refreshData()
              if (warning) throw new Error(warning)
            })
          }
        />
      )
      break
    case LEADERBOARD:
      content = (
        <Leaderboard
          {...common}
          teams={visibleTeams}
          totalQuests={visibleQuests.length}
          myTeamId={currentTeamId}
          questsOpen={questsOpen}
        />
      )
      break
    case SPIN:
      content = <PresentSpin {...common} teams={visibleTeams} spin={spinState} />
      break
    case ADMIN_LOGIN:
      content = (
        <AdminLogin
          onSubmit={submitAdminLogin}
        />
      )
      break
    case SETTINGS:
      content = <AdminSettings {...admin} />
      break
    case ADMIN_SPIN:
      content = <AdminSpin {...admin} teams={visibleTeams} spin={spinState} />
      break
    case STUDENTS:
      content = (
        <StudentDirectory
          {...admin}
          users={appData?.users ?? []}
          teams={visibleTeams}
        />
      )
      break
    case MANAGER:
      content = (
        <QuestManager
          {...admin}
          quests={visibleQuests}
          teams={visibleTeams}
          onReview={() => setScreen(REVIEW)}
          onSaveQuest={async (draft: QuestDraft, no?: number) =>
            runAction(async () => {
              await saveQuest(draft, no)
              await refreshData()
            })
          }
          onDeleteQuest={async (no: number) =>
            runAction(async () => {
              const warning = await deleteQuest(no)
              await refreshData()
              if (warning) throw new Error(warning)
            })
          }
        />
      )
      break
    case REVIEW:
      content = (
        <ReviewSubmissions
          {...admin}
          teams={visibleTeams}
          quests={visibleQuests}
          submissions={appData?.submissions ?? []}
          onReviewSubmission={(id, status, feedback) =>
            runAction(async () => {
              await reviewSubmission(id, status, feedback)
              await refreshData()
            })
          }
        />
      )
      break
    default:
      content = (
        <Register
          firstName=""
          lastName=""
          classroom=""
          number=""
          classrooms={classrooms}
          classroomsError={classroomsError}
          onSubmit={submitRegister}
          onGoLogin={() => setScreen(LOGIN)}
        />
      )
  }

  function describeClassroomLoadError(error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'PGRST202') {
      return 'Supabase ยังไม่พบ RPC รายชื่อชั้น/ห้อง ให้รัน supabase/connect_app.sql ฉบับล่าสุดใน SQL Editor แล้วลองใหม่'
    }
    if (error instanceof Error) return error.message
    if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
      return error.message
    }
    return 'โหลดรายชื่อชั้น/ห้องไม่สำเร็จ'
  }

  function isMissingProfileError(error: unknown) {
    return error instanceof Error && error.message === 'ไม่พบโปรไฟล์ผู้ใช้'
  }

  function getActionErrorMessage(error: unknown) {
    if (error instanceof Error) return error.message
    if (typeof error !== 'object' || error === null) return 'ทำรายการไม่สำเร็จ'
    if ('message' in error && typeof error.message === 'string') return error.message
    if ('code' in error && typeof error.code === 'string') return `ทำรายการไม่สำเร็จ (${error.code})`
    return 'ทำรายการไม่สำเร็จ'
  }

  return (
    <>
      {appNotice && (
        <div role="status" className="fixed left-1/2 top-3 z-[100] flex max-w-[calc(100%-1.5rem)] -translate-x-1/2 items-start gap-4 rounded-lg border border-line bg-panel px-4 py-3 text-sm text-fg shadow-xl">
          <span>{appNotice}</span>
          <button type="button" onClick={() => setAppNotice('')} className="shrink-0 underline underline-offset-2">ปิด</button>
        </div>
      )}
      {appError && (
        <div role="alert" className="fixed left-1/2 top-3 z-[100] flex max-w-[calc(100%-1.5rem)] -translate-x-1/2 items-start gap-4 rounded-lg border border-rose/50 bg-panel px-4 py-3 text-sm text-rose shadow-xl">
          <span>{appError}</span>
          <button type="button" onClick={() => setAppError('')} className="shrink-0 underline underline-offset-2">ปิด</button>
        </div>
      )}
      {content}
    </>
  )
}
