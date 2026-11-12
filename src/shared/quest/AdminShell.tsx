import React from 'react'
import { ClipboardCheck, Dices, LogOut, Map, Settings, Users } from 'lucide-react'

export type AdminTab = 'quests' | 'review' | 'spin' | 'settings' | 'students'

type Props = {
  active: AdminTab
  questsOpen: boolean
  pendingCount?: number
  teacher?: string
  onNavigate?: (tab: AdminTab) => void
  onToggleQuests?: (open: boolean) => void
  onLogout?: () => void
  children: React.ReactNode
}

export function AdminShell({
  active,
  questsOpen,
  pendingCount = 0,
  teacher = 'ครู',
  onNavigate,
  onToggleQuests,
  onLogout,
  children,
}: Props) {
  const items: { id: AdminTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'quests', label: 'จัดการภารกิจ', icon: <Map className="size-4" /> },
    { id: 'review', label: 'ตรวจงาน', icon: <ClipboardCheck className="size-4" />, badge: pendingCount },
    { id: 'spin', label: 'สุ่มพรีเซนต์', icon: <Dices className="size-4" /> },
    { id: 'students', label: 'รายชื่อนักเรียน', icon: <Users className="size-4" /> },
    { id: 'settings', label: 'ตั้งค่า', icon: <Settings className="size-4" /> },
  ]

  return (
    <div className="flex h-full min-h-0 flex-col bg-ink md:flex-row">
      <aside className="flex shrink-0 flex-col border-b border-line bg-panel md:w-60 md:border-b-0 md:border-r">
        <div className="flex items-center gap-2 px-4 py-3 md:px-5 md:py-5">
          <div className="grid size-8 place-items-center rounded-md bg-fg font-pixel text-sm font-bold text-ink">
            Q
          </div>
          <div className="leading-tight">
            <p className="font-display font-semibold">QuestCraft</p>
            <p className="text-xs text-muted">หลังบ้านครู</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            aria-label="ออกจากระบบ"
            className="ml-auto grid size-9 place-items-center rounded-md text-muted transition-colors duration-150 hover:bg-panel-2 hover:text-fg md:hidden"
          >
            <LogOut className="size-4" />
          </button>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible md:px-3">
          {items.map((it) => (
            <button
              key={it.id}
              type="button"
              onClick={() => onNavigate?.(it.id)}
              className={[
                'flex h-10 flex-1 items-center gap-2.5 whitespace-nowrap rounded-md px-3 text-sm font-medium transition-colors duration-150 md:flex-none',
                active === it.id ? 'bg-panel-2 text-fg' : 'text-muted hover:bg-panel-2/60 hover:text-fg',
              ].join(' ')}
            >
              {it.icon}
              {it.label}
              {it.badge ? (
                <span className="ml-auto rounded-full bg-amber px-1.5 font-pixel text-xs leading-5 text-ink">
                  {it.badge}
                </span>
              ) : null}
            </button>
          ))}
        </nav>

        <div className="hidden items-center gap-2 border-t md:mt-auto border-line px-5 py-4 md:flex">
          <span className="grid size-8 place-items-center rounded-md bg-panel-2 font-display text-sm">
            {teacher.replace('ครู', '').charAt(0)}
          </span>
          <span className="flex-1 truncate text-sm">{teacher}</span>
          <button
            type="button"
            onClick={onLogout}
            aria-label="ออกจากระบบ"
            className="grid size-8 place-items-center rounded-md text-muted transition-colors duration-150 hover:bg-panel-2 hover:text-fg"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </aside>

      <div className="min-h-0 min-w-0 flex-1">{children}</div>
    </div>
  )
}
