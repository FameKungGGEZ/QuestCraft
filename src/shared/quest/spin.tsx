import React, { useCallback, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Check, Dices, GripVertical, Plus, RotateCcw, X } from 'lucide-react'
import { COVERS, SpinState, TEAMS, Team } from './data'

export type SpinController = {
  wheel: string[]
  done: string[]
  rotation: number
  spinning: boolean
  winner: string | null
  /** A colour picked at random for each team's slice. */
  colors: Record<string, string>
  add: (id: string) => void
  remove: (id: string) => void
  spin: () => void
  /** The winner has presented: move them out of the wheel into the presented list. */
  archive: () => void
  /** Close the popup; the team stays in the wheel. */
  dismiss: () => void
  reset: () => void
  sync: (state: SpinState) => void
}

export function useSpinState(
  init?: Partial<SpinState>,
  onChange?: (state: SpinState) => void
): SpinController {
  const reduce = useReducedMotion()
  const [wheel, setWheel] = useState<string[]>(init?.wheel ?? [])
  const [done, setDone] = useState<string[]>(init?.done ?? [])
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [winner, setWinner] = useState<string | null>(init?.winner ?? null)
  const busy = useRef(false)
  const [colors, setColors] = useState<Record<string, string>>(() => randomColors(init?.wheel ?? []))
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const add = (id: string) => {
    if (wheel.includes(id) || done.includes(id)) return
    setColors((c) => ({ ...c, [id]: pickColor(Object.values(c)) }))
    const nextWheel = [...wheel, id]
    setWheel(nextWheel)
    onChangeRef.current?.({ wheel: nextWheel, done, winner })
  }
  const remove = (id: string) => {
    if (busy.current || winner === id) return
    const nextWheel = wheel.filter((x) => x !== id)
    setWheel(nextWheel)
    onChangeRef.current?.({ wheel: nextWheel, done, winner })
  }
  const spin = () => {
    if (busy.current || winner || wheel.length === 0) return
    const slice = 360 / wheel.length
    const idx = Math.floor(Math.random() * wheel.length)
    const target = 360 * 6 + (360 - (idx * slice + slice / 2))
    busy.current = true
    setRotation((r) => r - (r % 360) + target)
    setSpinning(true)
    const pick = wheel[idx]
    window.setTimeout(
      () => {
        busy.current = false
        setSpinning(false)
        setWinner(pick)
        onChangeRef.current?.({ wheel, done, winner: pick })
      },
      reduce ? 50 : 4200
    )
  }
  const archive = () => {
    if (!winner) return
    const nextDone = [...done, winner]
    const nextWheel = wheel.filter((x) => x !== winner)
    setDone(nextDone)
    setWheel(nextWheel)
    setWinner(null)
    onChangeRef.current?.({ wheel: nextWheel, done: nextDone, winner: null })
  }
  const dismiss = () => {
    setWinner(null)
    onChangeRef.current?.({ wheel, done, winner: null })
  }
  const reset = () => {
    const nextWheel = [...new Set([...wheel, ...done])]
    setDone([])
    setWheel(nextWheel)
    setWinner(null)
    onChangeRef.current?.({ wheel: nextWheel, done: [], winner: null })
  }
  const sync = useCallback((state: SpinState) => {
    setWheel([...state.wheel])
    setDone([...state.done])
    setColors(randomColors(state.wheel))
    setRotation(0)
    setWinner(state.winner)
  }, [])
  return { wheel, done, rotation, spinning, winner, colors, add, remove, spin, archive, dismiss, reset, sync }
}

const PALETTE = ['#c8f04a', '#ffb547', '#ff6b6b', '#6fc3ff', '#b78bff', '#ff8fd0', '#4fe0b5', '#ffd84a']

function pickColor(used: string[]) {
  const fresh = PALETTE.filter((c) => !used.includes(c))
  const from = fresh.length ? fresh : PALETTE
  return from[Math.floor(Math.random() * from.length)]
}

function randomColors(ids: string[]) {
  const out: Record<string, string> = {}
  ids.forEach((id) => (out[id] = pickColor(Object.values(out))))
  return out
}

export function SpinView({
  spin,
  canControl,
  teams = TEAMS,
}: {
  spin: SpinController
  canControl: boolean
  teams?: Team[]
}) {
  const reduce = useReducedMotion()
  const [over, setOver] = useState(false)
  const { wheel, done, winner, spinning } = spin
  const slice = 360 / Math.max(wheel.length, 1)
  const teamOf = (id: string) => teams.find((team) => team.id === id)
  const winnerTeam = winner ? teamOf(winner) : null
  const available = teams.filter((t) => !wheel.includes(t.id) && !done.includes(t.id))

  return (
    <>
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_320px] lg:py-10">
        <section className="flex flex-col items-center">
          <div className="text-center">
            <p className="text-sm text-amber">ปิดรับภารกิจแล้ว</p>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              สุ่มทีมขึ้นพรีเซนต์เกม
            </h1>
          </div>

          <div
            className={[
              'relative mt-8 w-full max-w-[460px] rounded-full transition-shadow duration-150',
              over ? 'ring-4 ring-lime/70' : '',
            ].join(' ')}
            onDragOver={(e) => {
              if (!canControl) return
              e.preventDefault()
              setOver(true)
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              if (!canControl) return
              e.preventDefault()
              setOver(false)
              const id = e.dataTransfer.getData('text/plain')
              if (teams.some((t) => t.id === id)) spin.add(id)
            }}
          >
            <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-2">
              <div className="h-0 w-0 border-x-[14px] border-t-[22px] border-x-transparent border-t-lime" />
            </div>

            <motion.svg
              viewBox="-210 -210 420 420"
              className="aspect-square w-full"
              animate={{ rotate: spin.rotation }}
              transition={{ duration: reduce ? 0 : 4, ease: [0.12, 0.8, 0.2, 1] }}
            >
              <circle r={206} fill="var(--color-panel)" stroke="var(--color-line)" strokeWidth={4} />
              {wheel.map((id, i) => {
                const t = teamOf(id)
                if (!t) return null
                const a0 = ((i * slice - 90) * Math.PI) / 180
                const a1 = (((i + 1) * slice - 90) * Math.PI) / 180
                const large = slice > 180 ? 1 : 0
                const mid = i * slice + slice / 2
                const isWin = id === winner
                const fill = spin.colors[id] ?? PALETTE[i % PALETTE.length]
                return (
                  <g key={id} opacity={winner && !isWin ? 0.35 : 1}>
                    {wheel.length > 1 ? (
                      <path
                        d={`M0 0 L${200 * Math.cos(a0)} ${200 * Math.sin(a0)} A200 200 0 ${large} 1 ${200 * Math.cos(a1)} ${200 * Math.sin(a1)} Z`}
                        fill={fill}
                        stroke="var(--color-ink)"
                        strokeWidth={4}
                      />
                    ) : (
                      <circle r={200} fill={fill} />
                    )}
                    <text
                      transform={`rotate(${mid}) translate(0 -118) rotate(90)`}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="font-display"
                      fontSize={wheel.length > 5 ? 17 : 20}
                      fontWeight={600}
                      fill="var(--color-ink)"
                    >
                      {t.name.length > 12 ? t.name.slice(0, 11) + '…' : t.name}
                    </text>
                  </g>
                )
              })}
              <circle r={34} fill="var(--color-ink)" stroke="var(--color-line)" strokeWidth={4} />
            </motion.svg>

            {wheel.length === 0 && canControl && (
              <p className="pointer-events-none absolute inset-0 grid place-items-center px-24 text-center text-sm text-muted">
                ลากชื่อทีมมาวางที่วงล้อ
              </p>
            )}

            {canControl ? (
              <button
                type="button"
                onClick={spin.spin}
                disabled={spinning || wheel.length === 0 || !!winner}
                className="absolute left-1/2 top-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-lime text-ink transition-transform duration-150 hover:scale-105 active:scale-95 disabled:opacity-60 disabled:hover:scale-100"
                aria-label="หมุน"
              >
                <Dices className="size-7" />
              </button>
            ) : (
              <div className="pointer-events-none absolute left-1/2 top-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-panel-2 text-muted">
                <Dices className="size-7" />
              </div>
            )}
          </div>

          <p className="mt-8 text-center text-sm text-muted">
            {wheel.length === 0
              ? done.length > 0
                ? 'ไม่มีทีมในวงล้อ'
                : ''
              : spinning
                ? 'กำลังหมุน…'
                : canControl
                  ? `ในวงล้อ ${wheel.length} ทีม · กดปุ่มกลางวงล้อเพื่อสุ่ม`
                  : `ในวงล้อ ${wheel.length} ทีม · รอครูกดสุ่ม`}
          </p>
        </section>

        <aside className="space-y-8 lg:border-l lg:border-line lg:pl-8">
          {canControl && (
            <div>
              <h2 className="font-display text-lg font-semibold">ทีมที่ลงทะเบียน</h2>
              <p className="mt-1 text-xs text-muted">ลากไปวางที่วงล้อ หรือกดปุ่ม +</p>
              {available.length === 0 ? (
                <p className="mt-3 text-sm text-muted">ทุกทีมอยู่ในวงล้อหรือนำเสนอแล้ว</p>
              ) : (
                <ul className="mt-3 space-y-1.5">
                  {available.map((t) => (
                    <li
                      key={t.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('text/plain', t.id)}
                      className="flex cursor-grab items-center gap-2 rounded-md border border-line bg-panel px-2 py-1.5 active:cursor-grabbing"
                    >
                      <GripVertical className="size-4 shrink-0 text-muted" />
                      <img src={COVERS[t.cover]} alt="" className="img-pixel size-7 rounded object-cover" />
                      <span className="min-w-0 flex-1 truncate text-sm">{t.name}</span>
                      <button
                        type="button"
                        onClick={() => spin.add(t.id)}
                        aria-label={`เพิ่ม ${t.name}`}
                        className="grid size-7 place-items-center rounded text-muted transition-colors duration-150 hover:bg-panel-2 hover:text-lime"
                      >
                        <Plus className="size-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div>
            <h2 className="font-display text-lg font-semibold">อยู่ในวงล้อ</h2>
            {wheel.length === 0 ? (
              <p className="mt-3 text-sm text-muted">ยังไม่มีทีม</p>
            ) : (
              <ul className="mt-3 space-y-1">
                {wheel.map((id) => {
                  const t = teamOf(id)
                  if (!t) return null
                  return (
                    <li key={id} className="flex items-center gap-3 py-1.5">
                      <span
                        className="size-3 shrink-0 rounded-full"
                        style={{ background: spin.colors[id] }}
                        aria-hidden
                      />
                      <img src={COVERS[t.cover]} alt="" className="img-pixel size-7 rounded object-cover" />
                      <span className="min-w-0 flex-1 truncate text-sm">{t.name}</span>
                      {canControl && (
                        <button
                          type="button"
                          onClick={() => spin.remove(id)}
                          disabled={spinning}
                          aria-label={`เอา ${t.name} ออกจากวงล้อ`}
                          className="grid size-7 place-items-center rounded text-muted transition-colors duration-150 hover:bg-panel-2 hover:text-rose disabled:opacity-40"
                        >
                          <X className="size-4" />
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">ลำดับพรีเซนต์</h2>
              {canControl && done.length > 0 && (
                <button
                  type="button"
                  onClick={spin.reset}
                  className="flex items-center gap-1.5 text-sm text-muted transition-colors duration-150 hover:text-fg"
                >
                  <RotateCcw className="size-3.5" /> เริ่มใหม่
                </button>
              )}
            </div>
            {done.length === 0 ? (
              <p className="mt-3 text-sm text-muted">ยังไม่มีทีมที่นำเสนอ</p>
            ) : (
              <ol className="mt-3 space-y-1">
                {done.map((id, i) => {
                  const t = teamOf(id)
                  if (!t) return null
                  return (
                    <li key={id} className="flex items-center gap-3 py-1.5">
                      <span className="w-6 font-pixel text-lg text-muted">{i + 1}</span>
                      <img src={COVERS[t.cover]} alt="" className="img-pixel size-8 rounded object-cover" />
                      <span className="min-w-0 flex-1 truncate">{t.name}</span>
                      <span className="text-xs text-muted">นำเสนอแล้ว</span>
                    </li>
                  )
                })}
              </ol>
            )}
          </div>
        </aside>
      </div>

      <AnimatePresence>
        {winnerTeam && (
          <motion.div
            key="popup"
            className="fixed inset-0 z-50 grid place-items-center bg-ink/80 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <motion.div
              role="dialog"
              aria-label="ทีมที่ถูกสุ่ม"
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
              className="w-full max-w-sm rounded-2xl border border-lime/60 bg-panel p-6 text-center"
            >
              <p className="text-sm text-lime">ทีมที่ได้ขึ้นพรีเซนต์</p>
              <img
                src={COVERS[winnerTeam.cover]}
                alt=""
                className="img-pixel mx-auto mt-4 size-28 rounded-xl object-cover"
              />
              <p className="mt-4 font-display text-3xl font-bold">{winnerTeam.name}</p>
              <p className="mt-1 text-sm text-muted">
                {winnerTeam.members.length} คน · หัวหน้า {winnerTeam.owner}
              </p>
              {canControl ? (
                <div className="mt-6 grid gap-2">
                  <button
                    type="button"
                    onClick={spin.archive}
                    className="flex h-11 items-center justify-center gap-2 rounded-md bg-lime px-4 text-sm font-semibold text-ink transition-[transform,background-color] duration-150 hover:bg-[#d6f86a] active:scale-[0.98]"
                  >
                    <Check className="size-4" /> นำเสนอเรียบร้อย · นำออกจากวงล้อ
                  </button>
                  <button
                    type="button"
                    onClick={spin.dismiss}
                    className="h-11 rounded-md border border-line px-4 text-sm text-fg transition-colors duration-150 hover:bg-panel-2"
                  >
                    ปิด · ให้ทีมนี้อยู่ในวงล้อต่อ
                  </button>
                </div>
              ) : (
                <p className="mt-6 text-sm text-muted">รอครูยืนยัน…</p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
