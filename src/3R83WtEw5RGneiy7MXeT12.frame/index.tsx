import React, { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Crown, Lock, LogOut, Pencil, Plus, ArrowRight } from 'lucide-react'
import { StudentNav, StudentTab } from '../shared/quest/StudentNav'
import { COVERS, TEAMS, Team } from '../shared/quest/data'
import { TeamModal, TeamDraft } from './components/TeamModal'

export const args = {
  state: 'no-team',
  modal: 'none',
  questsOpen: true,
}

export const argTypes = {
  state: { control: 'radio', options: ['no-team', 'member', 'owner'] },
  modal: { control: 'radio', options: ['none', 'create', 'edit'] },
  questsOpen: { control: 'boolean' },
}

type Props = Partial<typeof args> & {
  teams?: Team[]
  myTeamId?: string | null
  onNavigate?: (tab: StudentTab) => void
  onLogout?: () => void
  userName?: string
  userMeta?: string
  totalQuests?: number
  onCreate?: (draft: TeamDraft) => void
  onUpdate?: (teamId: string, draft: TeamDraft) => void
  onJoin?: (teamId: string) => void
  onLeave?: () => void
}

export default function Teams(props: Props) {
  const {
    state,
    teams: teamsProp,
    myTeamId: selectedTeamId,
    modal,
    questsOpen,
    onNavigate,
    onLogout,
    userName,
    userMeta,
    totalQuests = 0,
    onCreate,
    onUpdate,
    onJoin,
    onLeave,
  } = {
    ...args,
    ...props,
  }
  const teams = teamsProp ?? TEAMS
  const [open, setOpen] = useState(modal)
  useEffect(() => setOpen(modal), [modal])

  const myTeam: Team | undefined = selectedTeamId
    ? teams.find((t) => t.id === selectedTeamId)
    : undefined
  const hasTeam = myTeam !== undefined
  const others = teams.filter((t) => t.id !== myTeam?.id)

  return (
    <div className="flex h-full min-h-0 flex-col bg-ink">
      <StudentNav
        active="team"
        hasTeam={hasTeam}
        questsOpen={questsOpen}
        userName={userName}
        userMeta={userMeta}
        onNavigate={onNavigate}
        onLogout={onLogout}
      />

      <main className="pixel-grid min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
          {myTeam ? (
            <MyTeam
              team={myTeam}
              isOwner={state === 'owner'}
              onEdit={() => setOpen('edit')}
              onLeave={onLeave}
              onGoQuests={() => onNavigate?.(questsOpen ? 'quests' : 'spin')}
              questsOpen={questsOpen}
              totalQuests={totalQuests}
            />
          ) : (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                  หาทีมของคุณ
                </h1>
                <p className="mt-2 flex items-center gap-2 text-[15px] text-muted">
                  <Lock className="size-4 shrink-0 text-amber" />
                  ภารกิจจะปลดล็อคเมื่อคุณมีทีมแล้ว
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen('create')}
                className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-lime px-5 font-display font-semibold text-ink transition-[transform,background-color] duration-150 hover:bg-[#d6f86a] active:scale-[0.98]"
              >
                <Plus className="size-5" strokeWidth={2.5} />
                สร้างทีม
              </button>
            </div>
          )}

          <div className="mt-10 flex items-baseline justify-between border-b border-line pb-3">
            <h2 className="font-display text-xl font-semibold">
              {myTeam ? 'ทีมอื่นในห้อง' : 'ทีมทั้งหมด'}
            </h2>
            <span className="text-sm text-muted">{teams.length} ทีม · สูงสุด 5 คนต่อทีม</span>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {!myTeam && (
              <button
                type="button"
                onClick={() => setOpen('create')}
                className="group flex min-h-[248px] flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-line text-muted transition-colors duration-150 hover:border-lime hover:text-lime"
              >
                <span className="grid size-14 place-items-center rounded-full border-2 border-current">
                  <Plus className="size-7" strokeWidth={2.5} />
                </span>
                <span className="font-display text-lg font-semibold">สร้างทีม</span>
              </button>
            )}
            {others.map((t) => (
              <TeamCard key={t.id} team={t} canJoin={!hasTeam} onJoin={() => onJoin?.(t.id)} />
            ))}
          </div>
        </div>
      </main>

      <AnimatePresence>
        {open !== 'none' && (
          <TeamModal
            key={open}
            mode={open === 'edit' ? 'edit' : 'create'}
            initial={
              open === 'edit' && myTeam
                ? { name: myTeam.name, cover: myTeam.cover, capacity: myTeam.capacity }
                : undefined
            }
            minCapacity={open === 'edit' && myTeam ? myTeam.members.length : 1}
            onClose={() => setOpen('none')}
            onSave={(d) => {
              setOpen('none')
              if (open === 'create') onCreate?.(d)
              else if (myTeam) onUpdate?.(myTeam.id, d)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function TeamCard({ team, canJoin, onJoin }: { team: Team; canJoin: boolean; onJoin: () => void }) {
  const full = team.members.length >= team.capacity
  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-line bg-panel">
      <div className="relative h-28 overflow-hidden">
        <img src={COVERS[team.cover]} alt="" className="img-pixel size-full object-cover" />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="truncate font-display text-lg font-semibold">{team.name}</h3>
        <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
          <Crown className="size-3.5 text-amber" />
          {team.owner}
        </p>
        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          <Seats filled={team.members.length} capacity={team.capacity} />
          <button
            type="button"
            disabled={!canJoin || full}
            onClick={onJoin}
            className="h-9 shrink-0 whitespace-nowrap rounded-md border border-line px-4 text-sm font-medium transition-colors duration-150 enabled:hover:border-lime enabled:hover:text-lime disabled:cursor-not-allowed disabled:text-muted/70"
          >
            {full ? 'เต็มแล้ว' : 'เข้าร่วม'}
          </button>
        </div>
      </div>
    </article>
  )
}

function Seats({ filled, capacity }: { filled: number; capacity: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {Array.from({ length: capacity }).map((_, i) => (
          <span
            key={i}
            className={['h-3 w-3 rounded-[3px]', i < filled ? 'bg-lime' : 'border border-line'].join(' ')}
          />
        ))}
      </div>
      <span className="font-pixel text-sm text-muted">
        {filled}/{capacity}
      </span>
    </div>
  )
}

function MyTeam({
  team,
  isOwner,
  onEdit,
  onLeave,
  onGoQuests,
  questsOpen,
  totalQuests,
}: {
  team: Team
  isOwner: boolean
  onEdit: () => void
  onLeave?: () => void
  onGoQuests: () => void
  questsOpen: boolean
  totalQuests: number
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-panel">
      <div className="relative h-40 sm:h-52">
        <img src={COVERS[team.cover]} alt="" className="img-pixel size-full object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(to_top,var(--color-panel),transparent_70%)]" />
        <div className="absolute bottom-4 left-5 right-5 flex flex-wrap items-end justify-between gap-3 sm:left-6 sm:right-6">
          <div className="min-w-0">
            <p className="text-sm text-fg/80">ทีมของคุณ</p>
            <h1 className="truncate font-display text-3xl font-bold sm:text-4xl">{team.name}</h1>
          </div>
          {isOwner ? (
            <button
              type="button"
              onClick={onEdit}
              className="flex h-10 items-center gap-2 whitespace-nowrap rounded-md bg-ink/80 px-4 text-sm font-medium backdrop-blur transition-colors duration-150 hover:bg-ink"
            >
              <Pencil className="size-4" /> แก้ไขทีม
            </button>
          ) : (
            <button
              type="button"
              onClick={onLeave}
              className="flex h-10 items-center gap-2 whitespace-nowrap rounded-md bg-ink/80 px-4 text-sm font-medium text-rose backdrop-blur transition-colors duration-150 hover:bg-ink"
            >
              <LogOut className="size-4" /> ออกจากทีม
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1fr_300px]">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium">สมาชิก</h2>
            <Seats filled={team.members.length} capacity={team.capacity} />
          </div>
          <ul className="divide-y divide-line">
            {team.members.map((m) => (
              <li key={`${m.classroom}-${m.no}`} className="flex items-center gap-3 py-2.5">
                <span className="grid size-8 shrink-0 place-items-center rounded-md bg-panel-2 font-display text-sm">
                  {m.name.charAt(0)}
                </span>
                <span className="min-w-0 flex-1 truncate">{m.name}</span>
                {m.name === team.owner && (
                  <span className="flex items-center gap-1 text-xs text-amber">
                    <Crown className="size-3.5" /> หัวหน้าทีม
                  </span>
                )}
                <span className="whitespace-nowrap text-sm text-muted">
                  {m.classroom} · {m.no}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col justify-between gap-4 rounded-lg bg-panel-2 p-5">
          <div>
            <p className="font-display text-lg font-semibold text-lime">
              {questsOpen ? 'ปลดล็อคภารกิจแล้ว' : 'ปิดรับภารกิจแล้ว'}
            </p>
            <p className="mt-1 text-sm text-muted">
              {questsOpen
                ? `ผ่านแล้ว ${team.cleared} จาก ${totalQuests} ด่าน ไปต่อที่แผนที่ภารกิจได้เลย`
                : 'ถึงเวลาพรีเซนต์ ครูจะสุ่มลำดับทีมขึ้นนำเสนอ'}
            </p>
          </div>
          <button
            type="button"
            onClick={onGoQuests}
            className="group flex h-11 items-center justify-center gap-2 rounded-md bg-lime font-display font-semibold text-ink transition-[transform,background-color] duration-150 hover:bg-[#d6f86a] active:scale-[0.98]"
          >
            {questsOpen ? 'ไปที่แผนที่ภารกิจ' : 'ดูการสุ่มพรีเซนต์'}
            <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>
    </section>
  )
}
