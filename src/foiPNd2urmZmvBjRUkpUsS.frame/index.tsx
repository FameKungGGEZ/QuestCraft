import React from 'react'
import { AdminShell, AdminTab } from '../shared/quest/AdminShell'
import { Team } from '../shared/quest/data'
import { SpinController, SpinView, useSpinState } from '../shared/quest/spin'

export const args = {
  questsOpen: false,
}

export const argTypes = {
  questsOpen: { control: 'boolean' },
}

type Props = Partial<typeof args> & {
  teams?: Team[]
  /** Wheel state shared with every student's screen. */
  spin?: SpinController
  onNavigate?: (tab: AdminTab) => void
  onLogout?: () => void
  teacher?: string
  pendingCount?: number
}

export default function AdminSpin(props: Props) {
  const { questsOpen, spin: shared, teams, onNavigate, onLogout, teacher, pendingCount } = { ...args, ...props }
  const local = useSpinState()
  const spin = shared ?? local

  return (
    <AdminShell active="spin" questsOpen={questsOpen} onNavigate={onNavigate} onLogout={onLogout} teacher={teacher} pendingCount={pendingCount}>
      <div className="h-full overflow-y-auto">
        {questsOpen && (
          <p className="mx-4 mt-4 rounded-md border border-amber/40 bg-panel px-3 py-2 text-sm text-amber sm:mx-6">
            ยังเปิดรับภารกิจอยู่ · นักเรียนจะเห็นวงล้อนี้เมื่อปิดรับภารกิจในหน้าตั้งค่า
          </p>
        )}
        <SpinView spin={spin} canControl teams={teams} />
      </div>
    </AdminShell>
  )
}
