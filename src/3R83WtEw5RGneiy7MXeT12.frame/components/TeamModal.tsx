import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, ImagePlus, Minus, Plus, X } from 'lucide-react'
import { COVERS, CoverKey } from '../../shared/quest/data'
import { inputClass } from '../../shared/quest/AuthLayout'

export type TeamDraft = { name: string; cover: CoverKey; capacity: number }

const MAX = 5
const ease = [0.23, 1, 0.32, 1] as const

type Props = {
  mode: 'create' | 'edit'
  initial?: TeamDraft
  minCapacity?: number
  onClose: () => void
  onSave: (draft: TeamDraft) => void
}

export function TeamModal({ mode, initial, minCapacity = 1, onClose, onSave }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [cover, setCover] = useState<CoverKey>(initial?.cover ?? 'dragon')
  const [capacity, setCapacity] = useState(initial?.capacity ?? 5)
  const [touched, setTouched] = useState(false)
  const floor = Math.max(1, minCapacity)
  const nameMissing = name.trim().length === 0

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      onClick={onClose}
    >
      <motion.form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          setTouched(true)
          if (!nameMissing) onSave({ name, cover, capacity })
        }}
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.24, ease }}
        className="max-h-[92%] w-full max-w-lg overflow-y-auto rounded-t-xl border border-line bg-panel sm:rounded-xl"
      >
        <div className="relative h-36 overflow-hidden">
          <img src={COVERS[cover]} alt="" className="img-pixel size-full object-cover" />
          <div className="absolute inset-0 bg-[linear-gradient(to_top,var(--color-panel),transparent_60%)]" />
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="absolute right-3 top-3 grid size-9 place-items-center rounded-md bg-ink/80 transition-colors duration-150 hover:bg-ink"
          >
            <X className="size-4" />
          </button>
          <h2 className="absolute bottom-3 left-5 font-display text-2xl font-semibold">
            {mode === 'create' ? 'สร้างทีมใหม่' : 'แก้ไขทีม'}
          </h2>
        </div>

        <div className="space-y-6 p-5">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">
              ชื่อทีม <span className="text-rose">*</span>
            </span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
              placeholder="เช่น มังกรเขียว Studio"
              className={[inputClass, touched && nameMissing ? 'border-rose' : ''].join(' ')}
            />
            <span className="mt-1.5 flex justify-between text-xs">
              <span className={touched && nameMissing ? 'text-rose' : 'text-muted'}>
                {touched && nameMissing ? 'ต้องตั้งชื่อทีมก่อนสร้าง' : 'ตั้งชื่อได้สูงสุด 24 ตัวอักษร'}
              </span>
              <span className="font-pixel text-muted">{name.length}/24</span>
            </span>
          </label>

          <div>
            <span className="mb-2 block text-sm font-medium">ปกทีม</span>
            <div className="grid grid-cols-5 gap-2">
              {(Object.keys(COVERS) as CoverKey[]).map((k) => (
                <button
                  type="button"
                  key={k}
                  onClick={() => setCover(k)}
                  className={[
                    'relative aspect-[4/3] overflow-hidden rounded-md border-2 transition-colors duration-150',
                    cover === k ? 'border-lime' : 'border-transparent hover:border-line',
                  ].join(' ')}
                >
                  <img src={COVERS[k]} alt="" className="img-pixel size-full object-cover" />
                  {cover === k && (
                    <span className="absolute right-1 top-1 grid size-4 place-items-center rounded-sm bg-lime text-ink">
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                  )}
                </button>
              ))}
              <button
                type="button"
                className="flex aspect-[4/3] flex-col items-center justify-center gap-0.5 rounded-md border border-dashed border-line text-muted transition-colors duration-150 hover:border-lime hover:text-lime"
              >
                <ImagePlus className="size-4" />
                <span className="text-[11px]">อัปโหลด</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="block text-sm font-medium">จำนวนสมาชิกสูงสุด</span>
              <span className="text-xs text-muted">
                1–{MAX} คน{floor > 1 ? ` · ตอนนี้มีสมาชิก ${floor} คน` : ''}
              </span>
            </div>
            <div className="flex items-center rounded-md border border-line">
              <button
                type="button"
                aria-label="ลด"
                disabled={capacity <= floor}
                onClick={() => setCapacity((c) => Math.max(floor, c - 1))}
                className="grid size-10 place-items-center transition-colors duration-150 enabled:hover:bg-panel-2 disabled:text-muted/40"
              >
                <Minus className="size-4" />
              </button>
              <span className="w-10 text-center font-pixel text-lg">{capacity}</span>
              <button
                type="button"
                aria-label="เพิ่ม"
                disabled={capacity >= MAX}
                onClick={() => setCapacity((c) => Math.min(MAX, c + 1))}
                className="grid size-10 place-items-center transition-colors duration-150 enabled:hover:bg-panel-2 disabled:text-muted/40"
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-3 border-t border-line p-5">
          <button
            type="button"
            onClick={onClose}
            className="h-11 flex-1 rounded-md border border-line font-medium transition-colors duration-150 hover:bg-panel-2"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            className="h-11 flex-[2] rounded-md bg-lime font-display font-semibold text-ink transition-[transform,background-color] duration-150 hover:bg-[#d6f86a] active:scale-[0.98]"
          >
            {mode === 'create' ? 'สร้างทีม' : 'บันทึก'}
          </button>
        </div>
      </motion.form>
    </motion.div>
  )
}
