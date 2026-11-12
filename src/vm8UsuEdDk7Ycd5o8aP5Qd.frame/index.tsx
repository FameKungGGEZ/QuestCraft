import React from 'react'
import { StudentNav, StudentTab } from '../shared/quest/StudentNav'
import { Team } from '../shared/quest/data'
import { SpinController, SpinView, useSpinState } from '../shared/quest/spin'

export const args = {}

type Props = Partial<typeof args> & {
  teams?: Team[]
  /** Shared wheel state, driven by the teacher's screen. Students can only watch. */
  spin?: SpinController
  onNavigate?: (tab: StudentTab) => void
  onLogout?: () => void
  userName?: string
  userMeta?: string
}

export default function PresentSpin(props: Props) {
  const { spin: shared, teams, onNavigate, onLogout, userName, userMeta } = { ...args, ...props }
  const local = useSpinState()
  const spin = shared ?? local

  return (
    <div className="flex h-full min-h-0 flex-col bg-ink">
      <StudentNav active="spin" hasTeam questsOpen={false} userName={userName} userMeta={userMeta} onNavigate={onNavigate} onLogout={onLogout} />
      <main className="min-h-0 flex-1 overflow-y-auto">
        <SpinView spin={spin} canControl={false} teams={teams} />
      </main>
    </div>
  )
}
