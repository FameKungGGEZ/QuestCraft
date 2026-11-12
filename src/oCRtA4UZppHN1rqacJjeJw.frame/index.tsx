import React, { useState } from 'react'
import { ArrowRight, Loader2 } from 'lucide-react'
import { AuthLayout, Field, inputClass } from '../shared/quest/AuthLayout'

export const args = {
  state: 'default',
}

export const argTypes = {
  state: { control: 'select', options: ['default', 'error', 'submitting'] },
}

const EMPTY_CLASSROOMS: string[] = []

type Props = Partial<typeof args> & {
  classrooms?: string[]
  classroomsError?: string
  onSubmit?: (values: { classroom: string; number: string; password: string }) => Promise<void>
  onGoRegister?: () => void
}

export default function Login(props: Props) {
  const { state, onSubmit, onGoRegister } = { ...args, ...props }
  const classrooms = props.classrooms ?? EMPTY_CLASSROOMS
  const [values, setValues] = useState({ classroom: classrooms[0] ?? '', number: '', password: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const busy = submitting || state === 'submitting'

  React.useEffect(() => {
    if (!classrooms.includes(values.classroom)) {
      setValues((current) => ({ ...current, classroom: classrooms[0] ?? '' }))
    }
  }, [classrooms, values.classroom])

  return (
    <AuthLayout>
      <h1 className="font-display text-3xl font-semibold tracking-tight">กลับเข้าสู่ภารกิจ</h1>
      <p className="mt-2 text-[15px] text-muted">ทีมของคุณรออยู่ที่ด่านล่าสุด</p>

      {(state === 'error' || error) && (
        <div
          role="alert"
          className="mt-6 rounded-md border border-rose/40 bg-rose/10 px-3 py-2.5 text-sm text-rose"
        >
          {error || 'ชั้น/ห้อง เลขที่ หรือรหัสผ่านไม่ถูกต้อง'}
        </div>
      )}
      {props.classroomsError && (
        <p role="alert" className="mt-4 rounded-md border border-rose/40 bg-rose/10 px-3 py-2.5 text-sm text-rose">
          โหลดรายชื่อชั้น/ห้องไม่สำเร็จ: {props.classroomsError}
        </p>
      )}

      <form
        className="mt-8 space-y-4"
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
        <Field label="ชั้น / ห้อง">
          <select
            className={inputClass}
            value={values.classroom}
            onChange={(e) => setValues((v) => ({ ...v, classroom: e.target.value }))}
            disabled={classrooms.length === 0 || busy}
            required
          >
            <option value="" disabled>เลือกชั้น / ห้อง</option>
            {classrooms.map((classroom) => <option key={classroom} value={classroom}>{classroom}</option>)}
          </select>
        </Field>
        {classrooms.length === 0 && (
          <p className="text-xs text-muted">ยังไม่มีชั้น/ห้องที่ลงทะเบียน · ให้ลงทะเบียนบัญชีใหม่ก่อน</p>
        )}
        <Field label="เลขที่">
          <input
            className={inputClass}
            value={values.number}
            onChange={(e) => setValues((v) => ({ ...v, number: e.target.value }))}
            inputMode="numeric"
            autoComplete="username"
            placeholder="เช่น 12"
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
            required
          />
        </Field>

        <button
          type="submit"
          disabled={busy}
          className="group mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-lime font-display text-base font-semibold text-ink transition-[transform,background-color] duration-150 ease-out hover:bg-[#d6f86a] active:scale-[0.98] disabled:opacity-70"
        >
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" /> กำลังเข้าสู่ระบบ…
            </>
          ) : (
            <>
              เข้าสู่ระบบ
              <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        ยังไม่มีบัญชี?{' '}
        <button
          type="button"
          onClick={onGoRegister}
          className="font-medium text-lime underline-offset-4 hover:underline"
        >
          ลงทะเบียน
        </button>
      </p>
    </AuthLayout>
  )
}
