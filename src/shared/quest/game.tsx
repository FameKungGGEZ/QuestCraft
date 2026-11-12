import React, { createContext, useContext, useState } from 'react'
import { TEAMS, Team } from './data'
import { QuestStore, useQuestStore } from './questStore'
import { SUBMISSIONS, Submission, SubmissionStatus } from './submissions'

/**
 * One game shared by the teacher's back office and every student screen:
 * the quest list (same for every team), each team's own progress, and the
 * submission queue that links the two.
 */

export type GameTeam = Team & {
  /** The last answer the teacher sent back, shown until the team resubmits. */
  rejected?: { questNo: number; feedback?: string }
}

export type Answer = Submission['answer']

export type Game = {
  questStore: QuestStore
  teams: GameTeam[]
  submissions: Submission[]
  pendingCount: number
  submit: (teamId: string, questNo: number, answer: Answer, by: string) => void
  /** Withdraw the team's pending answer so it can be edited and sent again. */
  cancel: (teamId: string) => void
  review: (submissionId: string, status: SubmissionStatus, feedback?: string) => void
}

const now = () => {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function useGameState(): Game {
  const questStore = useQuestStore()
  const [teams, setTeams] = useState<GameTeam[]>(TEAMS)
  const [submissions, setSubmissions] = useState<Submission[]>(SUBMISSIONS)

  const patchTeam = (id: string, fn: (t: GameTeam) => GameTeam) =>
    setTeams((all) => all.map((t) => (t.id === id ? fn(t) : t)))

  const submit: Game['submit'] = (teamId, questNo, answer, by) => {
    const time = now()
    setSubmissions((all) => [
      {
        id: `s${Date.now()}`,
        teamId,
        questNo,
        submittedBy: by,
        submittedAt: `วันนี้ ${time}`,
        status: 'pending',
        answer,
      },
      ...all.filter((s) => !(s.teamId === teamId && s.status === 'pending')),
    ])
    patchTeam(teamId, (t) => ({ ...t, pending: questNo, rejected: undefined, lastSubmitAt: time }))
  }

  const cancel: Game['cancel'] = (teamId) => {
    setSubmissions((all) => all.filter((s) => !(s.teamId === teamId && s.status === 'pending')))
    patchTeam(teamId, (t) => ({ ...t, pending: undefined }))
  }

  const review: Game['review'] = (id, status, feedback) => {
    const sub = submissions.find((s) => s.id === id)
    if (!sub) return
    setSubmissions((all) => all.map((s) => (s.id === id ? { ...s, status, feedback } : s)))
    patchTeam(sub.teamId, (t) => {
      if (status === 'approved')
        return { ...t, cleared: Math.max(t.cleared, sub.questNo), pending: undefined, rejected: undefined }
      if (status === 'rejected')
        return { ...t, pending: undefined, rejected: { questNo: sub.questNo, feedback } }
      // undo a decision: back in the queue
      return {
        ...t,
        cleared: sub.status === 'approved' ? Math.min(t.cleared, sub.questNo - 1) : t.cleared,
        pending: sub.questNo,
        rejected: undefined,
      }
    })
  }

  const pendingCount = submissions.filter((s) => s.status === 'pending').length

  return { questStore, teams, submissions, pendingCount, submit, cancel, review }
}

const GameContext = createContext<Game | null>(null)

export function GameProvider({ game, children }: { game: Game; children: React.ReactNode }) {
  return <GameContext.Provider value={game}>{children}</GameContext.Provider>
}

/** The shared game when played inside the prototype, or a local copy when a frame is opened alone. */
export function useGame(): Game {
  const local = useGameState()
  return useContext(GameContext) ?? local
}

