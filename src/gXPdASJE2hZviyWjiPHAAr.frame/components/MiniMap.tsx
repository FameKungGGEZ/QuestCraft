import React from 'react'
import { Quest } from '../../shared/quest/data'

type Props = {
  view: { x: number; y: number; k: number }
  viewport: { w: number; h: number }
  quests: Quest[]
  size: { width: number; height: number }
  cleared: number
  current: number
  onJump: (worldX: number, worldY: number) => void
}

export function MiniMap({ view, viewport, quests, size: MAP_SIZE, cleared, current, onJump }: Props) {
  const rx = -view.x / view.k
  const ry = -view.y / view.k
  const rw = viewport.w / view.k
  const rh = viewport.h / view.k

  return (
    <div className="w-36 overflow-hidden rounded-lg border border-line bg-panel/95 backdrop-blur sm:w-52">
      <div className="flex items-center justify-between px-2.5 pt-2 text-[11px] text-muted">
        <span>แผนที่</span>
        <span className="font-pixel">
          {cleared}/{quests.length}
        </span>
      </div>
      <svg
        viewBox={`-80 -80 ${MAP_SIZE.width + 160} ${MAP_SIZE.height + 160}`}
        className="block w-full cursor-pointer"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          const sx = (MAP_SIZE.width + 160) / r.width
          onJump((e.clientX - r.left) * sx - 80, (e.clientY - r.top) * sx - 80)
        }}
      >
        <polyline
          points={quests.map((q) => `${q.x},${q.y}`).join(' ')}
          fill="none"
          stroke="var(--color-line)"
          strokeWidth={22}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {quests.map((q) => (
          <rect
            key={q.no}
            x={q.x - 44}
            y={q.y - 44}
            width={88}
            height={88}
            rx={18}
            fill={
              q.no <= cleared
                ? 'var(--color-lime)'
                : q.no === current
                  ? 'var(--color-fg)'
                  : 'var(--color-panel-2)'
            }
            stroke={q.no > cleared && q.no !== current ? 'var(--color-line)' : 'none'}
            strokeWidth={10}
          />
        ))}
        <rect
          x={rx}
          y={ry}
          width={rw}
          height={rh}
          fill="rgb(200 240 74 / 0.08)"
          stroke="var(--color-lime)"
          strokeWidth={16}
          rx={12}
        />
      </svg>
    </div>
  )
}
