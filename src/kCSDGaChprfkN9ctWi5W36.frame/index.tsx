import React, { useEffect, useState } from 'react'
import { AdminShell, AdminTab } from '../shared/quest/AdminShell'

export const args = {
  questsOpen: true,
}

export const argTypes = {
  questsOpen: { control: 'boolean' },
}

type Props = Partial<typeof args> & {
  onNavigate?: (tab: AdminTab) => void
  onToggleQuests?: (open: boolean) => void
  onLogout?: () => void
  teacher?: string
  pendingCount?: number
}

export default function AdminSettings(props: Props) {
  const { questsOpen: openArg, onNavigate, onToggleQuests, onLogout, teacher, pendingCount } = { ...args, ...props }
  const [local, setLocal] = useState(openArg)
  useEffect(() => setLocal(openArg), [openArg])
  const open = props.onToggleQuests ? openArg : local
  const toggle = () => (onToggleQuests ? onToggleQuests(!open) : setLocal(!open))

  return (
    <AdminShell
      active="settings"
      questsOpen={open}
      onNavigate={onNavigate}
      onLogout={onLogout}
      teacher={teacher}
      pendingCount={pendingCount}
    >
      <div className="h-full overflow-y-auto p-5 md:p-8">
        <h1 className="font-display text-2xl font-semibold">ตั้งค่า</h1>

        <section className="mt-6 max-w-2xl rounded-xl border border-line bg-panel p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="font-display text-lg font-semibold">เปิดรับภารกิจ</h2>
              <p className="mt-1 text-sm text-muted">
                เมื่อปิด นักเรียนทุกคนจะเข้าหน้าทำภารกิจไม่ได้ และหน้าภารกิจจะเปลี่ยนเป็นหน้าสุ่มพรีเซนต์แทน
                นักเรียนดูวงล้อได้ แต่มีเฉพาะเครื่องของครูที่กดสุ่มได้
              </p>
              <p className={['mt-3 text-sm font-medium', open ? 'text-lime' : 'text-amber'].join(' ')}>
                {open ? 'เปิดอยู่ · นักเรียนส่งงานได้' : 'ปิดแล้ว · นักเรียนเห็นหน้าสุ่มพรีเซนต์'}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={open}
              aria-label="เปิดรับภารกิจ"
              onClick={toggle}
              className={[
                'relative block h-8 w-14 shrink-0 rounded-full border-2 p-0 transition-colors duration-200',
                open ? 'border-lime bg-lime' : 'border-line bg-panel-2',
              ].join(' ')}
            >
              <span
                className={[
                  'absolute left-0.5 top-0.5 block size-6 rounded-full transition-[transform,background-color] duration-200 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]',
                  open ? 'translate-x-6 bg-ink' : 'translate-x-0 bg-fg',
                ].join(' ')}
              />
            </button>
          </div>

          {!open && (
            <button
              type="button"
              onClick={() => onNavigate?.('spin')}
              className="mt-5 h-10 rounded-md bg-lime px-4 text-sm font-semibold text-ink transition-[transform,background-color] duration-150 hover:bg-[#d6f86a] active:scale-[0.98]"
            >
              ไปหน้าสุ่มพรีเซนต์
            </button>
          )}
        </section>
      </div>
    </AdminShell>
  )
}
