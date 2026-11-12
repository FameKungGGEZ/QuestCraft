import React from 'react'
import { motion } from 'framer-motion'
import { AUTH_ART } from './data'

type Props = {
  children: React.ReactNode
}

export function AuthLayout({ children }: Props) {
  return (
    <main className="flex min-h-full w-full flex-col bg-ink lg:h-full lg:flex-row">
      <section className="relative h-56 shrink-0 overflow-hidden sm:h-72 lg:h-auto lg:w-[52%]">
        <img
          src={AUTH_ART}
          alt="แผนที่ภารกิจแบบพิกเซล"
          className="img-pixel absolute inset-0 size-full object-cover object-[50%_40%]"
        />
        <div className="absolute inset-0 bg-ink/35" />
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-[linear-gradient(to_top,var(--color-ink),transparent)]" />

        <div className="absolute left-5 top-5 flex items-center gap-2 sm:left-8 sm:top-8">
          <div className="grid size-9 place-items-center rounded-md bg-lime font-pixel text-base font-bold text-ink">
            Q
          </div>
          <span className="font-display text-xl font-semibold">QuestCraft</span>
        </div>

        <div className="absolute inset-x-5 bottom-5 sm:inset-x-8 sm:bottom-8 lg:bottom-12 lg:left-12 lg:right-12">
          <h2 className="max-w-md font-display text-3xl font-bold leading-[1.1] sm:text-4xl lg:text-5xl">
            รวมทีม ฝ่าด่าน
            <br />
            <span className="text-lime">สร้างเกมของคุณเอง</span>
          </h2>
        </div>
      </section>

      <section className="flex flex-1 items-center justify-center px-5 py-10 sm:px-10 lg:overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
          className="w-full max-w-[420px]"
        >
          {children}
        </motion.div>
      </section>
    </main>
  )
}

export function Field({
  label,
  children,
  hint,
  error,
}: {
  label: string
  children: React.ReactNode
  hint?: string
  error?: string
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-fg/90">{label}</span>
      {children}
      {error ? (
        <span className="mt-1.5 block text-xs text-rose">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-xs text-muted">{hint}</span>
      ) : null}
    </label>
  )
}

export const inputClass =
  'h-11 w-full rounded-md border border-line bg-panel px-3 text-[15px] text-fg placeholder:text-muted/70 outline-none transition-colors duration-150 focus:border-lime focus:bg-panel-2'
