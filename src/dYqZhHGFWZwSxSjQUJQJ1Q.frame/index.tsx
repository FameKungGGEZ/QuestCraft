import React, { useState } from 'react'
import { Loader2, ShieldCheck } from 'lucide-react'
import { Field, inputClass } from '../shared/quest/AuthLayout'

export const args = {
  state: 'default',
  username: '',
}

export const argTypes = {
  state: { control: 'select', options: ['default', 'error', 'submitting'] },
  username: { control: 'text' },
}

type Props = Partial<typeof args> & {
  onSubmit?: (values: { username: string; password: string }) => Promise<void>
}

export default function AdminLogin(props: Props) {
  const { state, username, onSubmit } = { ...args, ...props }
  const [values, setValues] = useState({ username, password: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const busy = submitting || state === 'submitting'

  return (
    <main className="pixel-grid flex h-full min-h-full w-full items-center justify-center bg-ink px-5 py-10">
      <div className="w-full max-w-[380px]">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-lg border border-line bg-panel">
            <ShieldCheck className="size-5 text-lime" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-semibold">หลังบ้านครู</h1>
            <p className="font-mono text-xs text-muted">/admin/login</p>
          </div>
        </div>

        <form
          className="mt-8 space-y-4 rounded-xl border border-line bg-panel p-6"
          onSubmit={async (e) => {
            e.preventDefault()
            setError('')
            setSubmitting(true)
            try {
              await onSubmit?.(values)
            } catch (reason) {
              setError(reason instanceof Error ? reason.message : 'เข้าสู่ระบบไม่สำเร็จ')
            } finally {
              setSubmitting(false)
            }
          }}
        >
          {(state === 'error' || error) && (
            <div role="alert" className="rounded-md border border-rose/40 bg-rose/10 px-3 py-2.5 text-sm text-rose">
              {error || 'ชื่อหรือรหัสไม่ถูกต้อง'}
            </div>
          )}
          <Field label="Username">
            <input
              className={inputClass}
              autoComplete="username"
              value={values.username}
              onChange={(e) => setValues((v) => ({ ...v, username: e.target.value }))}
              disabled={busy}
              required
            />
          </Field>
          <Field label="รหัสผ่าน">
            <input
              className={inputClass}
              type="password"
              autoComplete="current-password"
              value={values.password}
              onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
              placeholder="••••••••"
              disabled={busy}
              required
            />
          </Field>
          <button
            type="submit"
            disabled={busy}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-fg font-display font-semibold text-ink transition-[transform,opacity] duration-150 hover:opacity-90 active:scale-[0.98] disabled:opacity-70"
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            {busy ? 'กำลังตรวจสอบ…' : 'เข้าสู่หลังบ้าน'}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-muted">
          หน้านี้สำหรับครูเท่านั้น นักเรียนไม่เห็นลิงก์มาที่หน้านี้
        </p>
      </div>
    </main>
  )
}
