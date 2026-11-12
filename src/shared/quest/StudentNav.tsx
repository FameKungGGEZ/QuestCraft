import React from 'react'
import { Lock, Map, Trophy, Users, Dices, LogOut } from 'lucide-react'

export type StudentTab = 'quests' | 'team' | 'leaderboard' | 'spin'

type Props = {
  active: StudentTab
  hasTeam: boolean
  questsOpen?: boolean
  userName?: string
  userMeta?: string
  onNavigate?: (tab: StudentTab) => void
  onLogout?: () => void
}

export function StudentNav({
  active,
  hasTeam,
  questsOpen = true,
  userName = '',
  userMeta = '',
  onNavigate,
  onLogout,
}: Props) {
  const tabs: { id: StudentTab; label: string; icon: React.ReactNode; locked?: boolean }[] = [
    questsOpen
      ? { id: 'quests', label: 'ภารกิจ', icon: <Map className="size-4" />, locked: !hasTeam }
      : { id: 'spin', label: 'สุ่มพรีเซนต์', icon: <Dices className="size-4" /> },
    { id: 'team', label: 'ทีม', icon: <Users className="size-4" /> },
    { id: 'leaderboard', label: 'อันดับ', icon: <Trophy className="size-4" /> },
  ]

  return (
    <header className="relative z-30 flex h-16 shrink-0 items-center gap-3 border-b border-line bg-ink/95 px-3 sm:gap-6 sm:px-6">
      <div className="flex items-center gap-2">
        <div className="grid size-8 place-items-center rounded-md bg-lime font-pixel text-sm font-bold text-ink">
          Q
        </div>
        <span className="hidden font-display text-lg font-semibold tracking-tight md:block">
          QuestCraft
        </span>
      </div>

      <nav className="flex min-w-0 flex-1 items-center gap-1">
        {tabs.map((t) => {
          const isActive = active === t.id
          return (
            <button
              key={t.id}
              type="button"
              disabled={t.locked}
              onClick={() => !t.locked && onNavigate?.(t.id)}
              title={t.locked ? 'มีทีมก่อนถึงจะปลดล็อคภารกิจ' : undefined}
              className={[
                'flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-2.5 text-sm font-medium transition-colors duration-150 sm:px-3',
                isActive
                  ? 'bg-panel-2 text-fg'
                  : t.locked
                    ? 'cursor-not-allowed text-muted/60'
                    : 'text-muted hover:bg-panel hover:text-fg',
              ].join(' ')}
            >
              {t.locked ? <Lock className="size-4" /> : t.icon}
              <span>{t.label}</span>
              {isActive && <span className="size-1.5 rounded-full bg-lime" />}
            </button>
          )
        })}
      </nav>

      <div className="flex items-center gap-3">
        <div className="hidden text-right leading-tight sm:block">
          <div className="text-sm font-medium">{userName}</div>
          <div className="text-xs text-muted">{userMeta}</div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          aria-label="ออกจากระบบ"
          className="grid size-9 place-items-center rounded-md text-muted transition-colors duration-150 hover:bg-panel hover:text-fg"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </header>
  )
}
