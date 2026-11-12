import React from 'react'
import { Crown } from 'lucide-react'
import { StudentNav, StudentTab } from '../shared/quest/StudentNav'
import { COVERS, QUESTS, TEAMS, Team } from '../shared/quest/data'

export const args = {
  myTeamId: null,
  questsOpen: true,
}

export const argTypes = {
  myTeamId: { control: 'select', options: [] },
  questsOpen: { control: 'boolean' },
}

type Props = Omit<Partial<typeof args>, 'myTeamId'> & {
  teams?: Team[]
  totalQuests?: number
  myTeamId?: string | null
  onNavigate?: (tab: StudentTab) => void
  onLogout?: () => void
  userName?: string
  userMeta?: string
}

export default function Leaderboard(props: Props) {
  const { myTeamId, questsOpen, onNavigate, onLogout, teams: teamsProp, totalQuests, userName, userMeta } = { ...args, ...props }
  const teams = teamsProp ?? TEAMS
  const ranked = [...teams].sort((a, b) => {
    const progressOrder = b.cleared - a.cleared
    if (progressOrder !== 0) return progressOrder
    const aClearedAt = a.lastClearedAt ? Date.parse(a.lastClearedAt) : Number.NaN
    const bClearedAt = b.lastClearedAt ? Date.parse(b.lastClearedAt) : Number.NaN
    if (Number.isFinite(aClearedAt) && Number.isFinite(bClearedAt)) return aClearedAt - bClearedAt
    return a.lastSubmitAt.localeCompare(b.lastSubmitAt)
  })
  const [leader, ...rest] = ranked
  const total = totalQuests ?? QUESTS.length

  return (
    <div className="flex h-full min-h-0 flex-col bg-ink">
      <StudentNav
        active="leaderboard"
        hasTeam
        questsOpen={questsOpen}
        userName={userName}
        userMeta={userMeta}
        onNavigate={onNavigate}
        onLogout={onLogout}
      />

      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:py-10">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">อันดับทีม</h1>
            <p className="text-sm text-muted">นับจากด่านที่ครูตรวจผ่าน · เสมอกันวัดที่ใครส่งก่อน</p>
          </div>

          {/* #1 */}
          {leader ? <section className="relative mt-8 overflow-hidden rounded-xl border border-lime/50 bg-panel">
            <img
              src={COVERS[leader.cover]}
              alt=""
              className="img-pixel absolute inset-0 size-full object-cover opacity-30"
            />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-panel)_35%,transparent)]" />
            <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
              <div className="flex items-center gap-5">
                <span className="font-pixel text-7xl font-bold leading-none text-lime sm:text-8xl">1</span>
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm text-amber">
                    <Crown className="size-4" /> นำอยู่ตอนนี้
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-bold sm:text-3xl">{leader.name}</h2>
                  <p className="mt-1 text-sm text-muted">
                    {leader.members.length} คน · ส่งล่าสุด {leader.lastSubmitAt}
                  </p>
                </div>
              </div>
              <div className="sm:ml-auto sm:w-72">
                <p className="mb-2 text-right font-display text-lg">
                  ด่าน <span className="font-pixel text-2xl text-lime">{leader.cleared}</span>
                  <span className="text-muted"> / {total}</span>
                </p>
                <Progress team={leader} total={total} big />
              </div>
            </div>
          </section> : <p className="mt-8 rounded-xl border border-line bg-panel p-6 text-sm text-muted">ยังไม่มีทีมในอันดับ</p>}

          {/* the rest */}
          {leader && <ol className="mt-6 divide-y divide-line border-y border-line">
            {rest.map((t, i) => {
              const mine = t.id === myTeamId
              return (
                <li
                  key={t.id}
                  className={[
                    'grid grid-cols-[2.5rem_1fr] items-center gap-x-4 gap-y-2 px-2 py-4 sm:grid-cols-[3rem_minmax(0,1fr)_16rem_4rem]',
                    mine ? 'bg-lime/5' : '',
                  ].join(' ')}
                >
                  <span className="font-pixel text-2xl text-muted">{i + 2}</span>
                  <div className="flex min-w-0 items-center gap-3">
                    <img src={COVERS[t.cover]} alt="" className="img-pixel size-10 shrink-0 rounded-md object-cover" />
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {t.name}
                        {mine && <span className="ml-2 text-xs font-normal text-lime">ทีมคุณ</span>}
                      </p>
                      <p className="text-xs text-muted">
                        {t.pending ? `ด่าน ${t.pending} รอตรวจ` : `ส่งล่าสุด ${t.lastSubmitAt}`}
                      </p>
                    </div>
                  </div>
                  <div className="col-start-2 sm:col-start-auto">
                    <Progress team={t} total={total} />
                  </div>
                  <span className="hidden text-right font-display sm:block">
                    <span className="font-pixel text-lg">{t.cleared}</span>
                    <span className="text-muted">/{total}</span>
                  </span>
                </li>
              )
            })}
          </ol>}

          <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted">
            <Legend className="bg-lime" label="ผ่านแล้ว" />
            <Legend className="bg-amber" label="รอครูตรวจ" />
            <Legend className="bg-line" label="ยังไม่ถึง" />
          </div>
        </div>
      </main>
    </div>
  )
}

function Progress({ team, total, big }: { team: Team; total: number; big?: boolean }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: total }).map((_, i) => {
        const n = i + 1
        return (
          <span
            key={n}
            className={[
              'flex-1 rounded-[3px]',
              big ? 'h-3' : 'h-2',
              n <= team.cleared ? 'bg-lime' : n === team.pending ? 'bg-amber' : 'bg-line',
            ].join(' ')}
          />
        )
      })}
    </div>
  )
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={['size-2.5 rounded-[3px]', className].join(' ')} />
      {label}
    </span>
  )
}
