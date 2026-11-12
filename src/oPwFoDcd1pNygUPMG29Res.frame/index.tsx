import React, { useState } from 'react'
import { ArrowRight, Loader2 } from 'lucide-react'
import { AuthLayout, Field, inputClass } from '../shared/quest/AuthLayout'

export const args = {
  state: 'default',
  firstName: '',
  lastName: '',
  classroom: '',
  number: '',
}

export const argTypes = {
  state: { control: 'select', options: ['default', 'error', 'submitting'] },
  firstName: { control: 'text' },
  lastName: { control: 'text' },
  classroom: { control: 'text' },
  number: { control: 'text' },
}

type Props = Partial<typeof args> & {
  classrooms?: string[]
  classroomsError?: string
  onSubmit?: (values: { firstName: string; lastName: string; classroom: string; number: string; password: string }) => Promise<void>
  onGoLogin?: () => void
}

export default function Register(props: Props) {
  const { state, firstName, lastName, classroom, number, onSubmit, onGoLogin } = {
    ...args,
    ...props,
  }
  const [values, setValues] = useState({ firstName, lastName, classroom, number, password: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const busy = submitting || state === 'submitting'

  return (
    <AuthLayout>
      <h1 className="font-display text-3xl font-semibold tracking-tight">สร้างตัวละครของคุณ</h1>
      <p className="mt-2 text-[15px] text-muted">
        ใช้ชื่อจริงและเลขที่ตามทะเบียนห้อง ครูจะใช้ข้อมูลนี้ตรวจงานของทีม
      </p>

      <form
        className="mt-8 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault()
          setError('')
          setSubmitting(true)
          try {
            await onSubmit?.(values)
          } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'ลงทะเบียนไม่สำเร็จ')
          } finally {
            setSubmitting(false)
          }
        }}
      >
        {error && <p role="alert" className="rounded-md border border-rose/40 bg-rose/10 px-3 py-2.5 text-sm text-rose">{error}</p>}
        {props.classroomsError && (
          <p role="alert" className="rounded-md border border-rose/40 bg-rose/10 px-3 py-2.5 text-sm text-rose">
            โหลดรายชื่อชั้น/ห้องไม่สำเร็จ: {props.classroomsError}
          </p>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="ชื่อ">
            <input
              className={inputClass}
              value={values.firstName}
              onChange={(e) => setValues((v) => ({ ...v, firstName: e.target.value }))}
              placeholder="ชื่อจริง"
              required
            />
          </Field>
          <Field label="นามสกุล">
            <input
              className={inputClass}
              value={values.lastName}
              onChange={(e) => setValues((v) => ({ ...v, lastName: e.target.value }))}
              placeholder="นามสกุล"
              required
            />
          </Field>
        </div>

        <div className="grid grid-cols-[1fr_120px] gap-4">
          <Field label="ชั้น / ห้อง">
            <input
              className={inputClass}
              list="registered-classrooms"
              value={values.classroom}
              onChange={(e) => setValues((v) => ({ ...v, classroom: e.target.value }))}
              placeholder="เช่น 5/2 หรือ 5/A"
              required
            />
            <datalist id="registered-classrooms">
              {(props.classrooms ?? []).map((value) => <option key={value} value={value} />)}
            </datalist>
          </Field>
          <Field
            label="เลขที่"
            error={state === 'error' ? 'เลขที่นี้ในห้องนี้ลงทะเบียนแล้ว' : undefined}
          >
            <input
              className={[inputClass, state === 'error' ? 'border-rose' : ''].join(' ')}
              value={values.number}
              onChange={(e) => setValues((v) => ({ ...v, number: e.target.value }))}
              inputMode="numeric"
              placeholder="เช่น 12"
              required
            />
          </Field>
        </div>

        <Field label="ตั้งรหัสผ่าน" hint="ใช้รหัสผ่านนี้เข้าสู่ระบบ (อย่างน้อย 6 ตัว)">
          <input
            className={inputClass}
            type="password"
            autoComplete="new-password"
            minLength={6}
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
              <Loader2 className="size-4 animate-spin" /> กำลังลงทะเบียน…
            </>
          ) : (
            <>
              เริ่มผจญภัย
              <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        เคยลงทะเบียนแล้ว?{' '}
        <button
          type="button"
          onClick={onGoLogin}
          className="font-medium text-lime underline-offset-4 hover:underline"
        >
          เข้าสู่ระบบ
        </button>
      </p>
    </AuthLayout>
  )
}
