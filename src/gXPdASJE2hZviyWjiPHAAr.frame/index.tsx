import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Check, Clock, Lock, Maximize2, Minus, Plus, X as XIcon } from 'lucide-react'
import { StudentNav, StudentTab } from '../shared/quest/StudentNav'
import { Quest } from '../shared/quest/data'
import { AnswerDraft, Submission } from '../shared/quest/submissions'
import { DEFAULT_QUESTS, mapSizeFor } from '../shared/quest/questStore'
import { MiniMap } from './components/MiniMap'
import { QuestPanel, NodeStatus } from './components/QuestPanel'

export const args = {
  cleared: 0,
  submission: 'none',
  selected: 0,
  teamName: '',
}

export const argTypes = {
  cleared: { control: 'range', min: 0, max: 20, step: 1 },
  submission: { control: 'radio', options: ['none', 'pending', 'rejected'] },
  selected: { control: 'select', options: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
  teamName: { control: 'text' },
}

type Props = Partial<typeof args> & {
  onNavigate?: (tab: StudentTab) => void
  onLogout?: () => void
  onSubmitAnswer?: (questNo: number, answer: AnswerDraft) => void
  onCancelSubmission?: (submissionId: string) => Promise<boolean>
  /** Quests published from the teacher's quest manager. */
  quests?: Quest[]
  submissionData?: Submission
  userName?: string
  userMeta?: string
}

type View = { x: number; y: number; k: number }
const MIN_K = 0.35
const MAX_K = 2

export default function QuestMap(props: Props) {
  const { cleared, submission, selected, teamName, onNavigate, onLogout, onSubmitAnswer, onCancelSubmission, quests, submissionData, userName, userMeta } = {
    ...args,
    ...props,
  }
  const QUESTS = quests ?? DEFAULT_QUESTS
  const MAP_SIZE = mapSizeFor(QUESTS.length)
  const current = Math.min(cleared + 1, QUESTS.length + 1)
  const [picked, setPicked] = useState<number>(selected)
  useEffect(() => setPicked(selected), [selected])

  const statusOf = (q: Quest): NodeStatus => {
    if (q.no <= cleared) return 'cleared'
    if (q.no === current) {
      if (submission === 'pending') return 'pending'
      if (submission === 'rejected') return 'rejected'
      return 'active'
    }
    return 'locked'
  }

  // ---- pan & zoom ----
  const box = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 1280, h: 836 })
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 1 })
  const ready = useRef(false)

  const centerOn = useCallback(
    (wx: number, wy: number, k: number, s = size) => {
      setView({ k, x: s.w / 2 - wx * k, y: s.h / 2 - wy * k })
    },
    [size]
  )

  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => {
      const s = { w: e.contentRect.width, h: e.contentRect.height }
      setSize(s)
      if (!ready.current && s.w > 0) {
        ready.current = true
        const fit = Math.min(s.w / MAP_SIZE.width, s.h / MAP_SIZE.height)
        const k = clamp(fit * 1.6, 0.5, 1)
        const focus = QUESTS[Math.min(current, QUESTS.length) - 1] ?? { x: MAP_SIZE.width / 2, y: MAP_SIZE.height / 2 }
        setView({ k, x: s.w / 2 - focus.x * k, y: s.h / 2 - focus.y * k })
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [current]) // eslint-disable-line react-hooks/exhaustive-deps

  const zoomAt = useCallback((factor: number, cx: number, cy: number) => {
    setView((v) => {
      const k = clamp(v.k * factor, MIN_K, MAX_K)
      const r = k / v.k
      return { k, x: cx - (cx - v.x) * r, y: cy - (cy - v.y) * r }
    })
  }, [])

  useEffect(() => {
    const el = box.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - rect.left, e.clientY - rect.top)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoomAt])

  const drag = useRef<{ id: number; sx: number; sy: number; vx: number; vy: number } | null>(null)
  const [dragging, setDragging] = useState(false)

  const fitAll = () => {
    const k = clamp(Math.min(size.w / MAP_SIZE.width, size.h / MAP_SIZE.height) * 0.92, MIN_K, MAX_K)
    centerOn(MAP_SIZE.width / 2, MAP_SIZE.height / 2, k)
  }

  const pickedQuest = QUESTS.find((q) => q.no === picked)
  const path = QUESTS.map((q) => `${q.x},${q.y}`)

  if (QUESTS.length === 0) {
    return (
      <div className="flex h-full min-h-0 flex-col bg-ink">
        <StudentNav active="quests" hasTeam userName={userName} userMeta={userMeta} onNavigate={onNavigate} onLogout={onLogout} />
        <main className="pixel-grid grid min-h-0 flex-1 place-items-center p-6">
          <p className="rounded-lg border border-line bg-panel px-6 py-5 text-center text-muted">
            ครูยังไม่ได้เผยแพร่ภารกิจ
          </p>
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-ink">
      <StudentNav active="quests" hasTeam userName={userName} userMeta={userMeta} onNavigate={onNavigate} onLogout={onLogout} />

      <div
        ref={box}
        className={[
          'pixel-grid relative min-h-0 flex-1 touch-none select-none overflow-hidden',
          dragging ? 'cursor-grabbing' : 'cursor-grab',
        ].join(' ')}
        style={{ backgroundPosition: `${view.x}px ${view.y}px`, backgroundSize: `${32 * view.k}px ${32 * view.k}px` }}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest('[data-no-pan]')) return
          ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
          drag.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y }
          setDragging(true)
        }}
        onPointerMove={(e) => {
          const d = drag.current
          if (!d || d.id !== e.pointerId) return
          setView((v) => ({ ...v, x: d.vx + e.clientX - d.sx, y: d.vy + e.clientY - d.sy }))
        }}
        onPointerUp={() => {
          drag.current = null
          setDragging(false)
        }}
        onPointerCancel={() => {
          drag.current = null
          setDragging(false)
        }}
      >
        {/* world */}
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{
            width: MAP_SIZE.width,
            height: MAP_SIZE.height,
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`,
          }}
        >
          <svg className="absolute inset-0 overflow-visible" width={MAP_SIZE.width} height={MAP_SIZE.height}>
            <polyline
              points={path.join(' ')}
              fill="none"
              stroke="var(--color-line)"
              strokeWidth={6}
              strokeDasharray="2 14"
              strokeLinecap="round"
            />
            {cleared > 0 && (
              <polyline
                points={path.slice(0, Math.min(current, QUESTS.length)).join(' ')}
                fill="none"
                stroke="var(--color-lime)"
                strokeWidth={6}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>

          {QUESTS.map((q) => (
            <QuestNode
              key={q.no}
              quest={q}
              status={statusOf(q)}
              selected={picked === q.no}
              onClick={() => setPicked(q.no)}
            />
          ))}
        </div>

        {/* HUD: team progress */}
        <div
          data-no-pan
          className="absolute left-3 top-3 max-w-[calc(100%-11rem)] rounded-lg border border-line bg-panel/95 px-4 py-3 backdrop-blur sm:left-5 sm:top-5"
        >
          <p className="truncate text-xs text-muted">{teamName}</p>
          <p className="mt-0.5 whitespace-nowrap font-display text-lg font-semibold">
            ผ่านแล้ว <span className="font-pixel text-lime">{cleared}</span>
            <span className="text-muted"> / {QUESTS.length}</span>
          </p>
          <div className="mt-2 flex max-w-[220px] flex-wrap gap-1">
            {QUESTS.map((q) => (
              <span
                key={q.no}
                className={[
                  'h-1.5 w-3.5 rounded-full sm:w-4',
                  q.no <= cleared
                    ? 'bg-lime'
                    : q.no === current && submission === 'pending'
                      ? 'bg-amber'
                      : 'bg-line',
                ].join(' ')}
              />
            ))}
          </div>
        </div>

        {/* minimap, top-right */}
        <div data-no-pan className="absolute right-3 top-3 sm:right-5 sm:top-5">
          <MiniMap
            view={view}
            viewport={size}
            quests={QUESTS}
            size={MAP_SIZE}
            cleared={cleared}
            current={current}
            onJump={(wx, wy) => centerOn(wx, wy, view.k)}
          />
        </div>

        {/* zoom controls */}
        <div
          data-no-pan
          className="absolute bottom-4 right-3 flex flex-col overflow-hidden rounded-lg border border-line bg-panel/95 backdrop-blur sm:right-5"
        >
          <ZoomBtn label="ซูมเข้า" onClick={() => zoomAt(1.25, size.w / 2, size.h / 2)}>
            <Plus className="size-4" />
          </ZoomBtn>
          <span className="border-y border-line py-1 text-center font-pixel text-xs text-muted">
            {Math.round(view.k * 100)}%
          </span>
          <ZoomBtn label="ซูมออก" onClick={() => zoomAt(0.8, size.w / 2, size.h / 2)}>
            <Minus className="size-4" />
          </ZoomBtn>
          <ZoomBtn label="ดูทั้งแผนที่" onClick={fitAll} bordered>
            <Maximize2 className="size-4" />
          </ZoomBtn>
        </div>

        <p className="pointer-events-none absolute bottom-4 left-1/2 hidden -translate-x-1/2 whitespace-nowrap text-xs text-muted md:block">
          ลากเพื่อเลื่อน · เลื่อนลูกกลิ้งเพื่อซูม
        </p>

        <AnimatePresence>
          {pickedQuest && (
            <QuestPanel
              key={pickedQuest.no}
              quest={pickedQuest}
              status={statusOf(pickedQuest)}
              submission={submissionData}
              onClose={() => setPicked(0)}
              onSubmit={(answer) => onSubmitAnswer?.(pickedQuest.no, answer)}
              onCancelSubmission={onCancelSubmission}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function QuestNode({
  quest,
  status,
  selected,
  onClick,
}: {
  quest: Quest
  status: NodeStatus
  selected: boolean
  onClick: () => void
}) {
  const tone = {
    cleared: 'bg-lime text-ink border-lime',
    active: 'bg-ink text-lime border-lime',
    pending: 'bg-amber text-ink border-amber',
    rejected: 'bg-ink text-rose border-rose',
    locked: 'bg-panel text-muted border-line',
  }[status]

  return (
    <button
      type="button"
      data-no-pan
      onClick={onClick}
      className="group absolute flex w-44 -translate-x-1/2 -translate-y-9 flex-col items-center gap-2"
      style={{ left: quest.x, top: quest.y }}
    >
      <span className="relative">
        {status === 'active' && (
          <span className="absolute -inset-2 animate-ping rounded-xl border-2 border-lime/50 [animation-duration:1.6s]" />
        )}
        <span
          className={[
            'relative grid size-[72px] place-items-center rounded-xl border-[3px] font-pixel text-2xl font-bold transition-transform duration-150 ease-out group-hover:-translate-y-0.5',
            tone,
            selected ? 'ring-4 ring-fg/80 ring-offset-4 ring-offset-ink' : '',
          ].join(' ')}
        >
          {status === 'cleared' ? (
            <Check className="size-8" strokeWidth={3} />
          ) : status === 'locked' ? (
            <Lock className="size-6" />
          ) : status === 'pending' ? (
            <Clock className="size-7" strokeWidth={2.5} />
          ) : status === 'rejected' ? (
            <XIcon className="size-8" strokeWidth={3} />
          ) : (
            quest.no
          )}
        </span>
      </span>
      <span className="rounded-md bg-ink/90 px-2 py-1 text-center">
        <span className="block font-pixel text-xs text-muted">ด่าน {quest.no}</span>
        <span
          className={[
            'block text-sm font-medium leading-snug',
            status === 'locked' ? 'text-muted' : 'text-fg',
          ].join(' ')}
        >
          {quest.title}
        </span>
      </span>
    </button>
  )
}

function ZoomBtn({
  children,
  label,
  onClick,
  bordered,
}: {
  children: React.ReactNode
  label: string
  onClick: () => void
  bordered?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={[
        'grid size-10 place-items-center text-fg/80 transition-colors duration-150 hover:bg-panel-2 hover:text-fg',
        bordered ? 'border-t border-line' : '',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

function clamp(n: number, a: number, b: number) {
  return Math.min(b, Math.max(a, n))
}
