import React, { useState } from 'react'
import { AdminShell } from './AdminShell'
import type { AdminTab } from './AdminShell'
import { compareClassrooms } from './classrooms'
import type { Team } from './data'
import type { UserProfile } from './supabase'

type Props = {
  users: UserProfile[]
  teams: Team[]
  questsOpen: boolean
  pendingCount?: number
  teacher?: string
  onNavigate?: (tab: AdminTab) => void
  onToggleQuests?: (open: boolean) => void
  onLogout?: () => void
}

const ALL_TEAMS = 'all'
const NO_TEAM = 'none'

export default function StudentDirectory({
  users,
  teams,
  questsOpen,
  pendingCount,
  teacher,
  onNavigate,
  onToggleQuests,
  onLogout,
}: Props) {
  const [teamFilter, setTeamFilter] = useState(ALL_TEAMS)
  const students = users
    .filter((user) => user.role === 'student')
    .filter((user) => {
      if (teamFilter === NO_TEAM) return user.team_id === null
      return teamFilter === ALL_TEAMS || String(user.team_id) === teamFilter
    })
    .sort((a, b) =>
      compareClassrooms(a.classroom, b.classroom) ||
      Number(a.number) - Number(b.number) ||
      a.first_name.localeCompare(b.first_name, 'th')
    )
  const teamNames = new Map(teams.map((team) => [Number(team.id), team.name]))
  const totalStudents = users.filter((user) => user.role === 'student').length

  return (
    <AdminShell
      active="students"
      questsOpen={questsOpen}
      pendingCount={pendingCount}
      teacher={teacher}
      onNavigate={onNavigate}
      onToggleQuests={onToggleQuests}
      onLogout={onLogout}
    >
      <main className="flex h-full min-h-0 flex-col">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line px-5 py-5 md:px-8">
          <div>
            <h1 className="font-display text-2xl font-semibold">รายชื่อนักเรียน</h1>
            <p className="mt-1 text-sm text-muted">นักเรียนที่มีโปรไฟล์ในระบบทั้งหมด {totalStudents} คน</p>
          </div>
          <label className="flex items-center gap-3 text-sm">
            <span className="text-muted">แสดงกลุ่ม</span>
            <select
              value={teamFilter}
              onChange={(event) => setTeamFilter(event.target.value)}
              className="h-10 min-w-48 rounded-md border border-line bg-panel px-3 text-fg outline-none focus:border-lime"
            >
              <option value={ALL_TEAMS}>ทั้งหมด</option>
              <option value={NO_TEAM}>ยังไม่มีกลุ่ม</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
          </label>
        </header>

        <section className="min-h-0 flex-1 overflow-auto p-5 md:p-8">
          <p className="mb-3 text-sm text-muted">แสดง {students.length} คน</p>
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[620px] border-collapse text-left text-sm">
              <thead className="sticky top-0 bg-panel text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">ชื่อ - นามสกุล</th>
                  <th scope="col" className="px-4 py-3 font-medium">ชั้น / ห้อง</th>
                  <th scope="col" className="px-4 py-3 font-medium">เลขที่</th>
                  <th scope="col" className="px-4 py-3 font-medium">กลุ่ม</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id} className="border-t border-line">
                    <td className="px-4 py-3 font-medium">{`${student.first_name} ${student.last_name}`.trim()}</td>
                    <td className="px-4 py-3">{student.classroom}</td>
                    <td className="px-4 py-3">{student.number}</td>
                    <td className="px-4 py-3">
                      {student.team_id === null ? (
                        <span className="text-muted">ยังไม่มีกลุ่ม</span>
                      ) : teamNames.get(student.team_id) ?? 'ไม่พบกลุ่ม'}
                    </td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-muted">
                      ไม่พบนักเรียนในกลุ่มที่เลือก
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </AdminShell>
  )
}
