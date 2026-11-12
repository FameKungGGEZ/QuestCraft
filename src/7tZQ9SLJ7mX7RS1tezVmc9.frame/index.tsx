import React, { useEffect, useState } from 'react'
import { Check, ExternalLink, FileText, Play, RotateCcw, X } from 'lucide-react'
import { AdminShell, AdminTab } from '../shared/quest/AdminShell'
import { COVERS, Quest, QUESTS, TEAMS, Team } from '../shared/quest/data'
import { SUBMISSIONS, Submission, SubmissionStatus } from '../shared/quest/submissions'

export const args = {
  questsOpen: true,
  filter: 'pending',
  selected: '',
}

export const argTypes = {
  questsOpen: { control: 'boolean' },
  filter: { control: 'radio', options: ['pending', 'done'] },
  selected: { control: 'select', options: [''] },
}

type Props = Partial<typeof args> & {
  teams?: Team[]
  quests?: Quest[]
  submissions?: Submission[]
  onReviewSubmission?: (id: string, status: SubmissionStatus, feedback?: string) => Promise<boolean | void>
  onNavigate?: (tab: AdminTab) => void
  onToggleQuests?: (open: boolean) => void
  onLogout?: () => void
  teacher?: string
  pendingCount?: number
}

export default function ReviewSubmissions(props: Props) {
  const {
    questsOpen,
    filter: filterArg,
    selected: selectedArg,
    teams: teamsProp,
    quests: questsProp,
    submissions: submissionsProp,
    onReviewSubmission,
    onNavigate,
    onToggleQuests,
    onLogout,
    teacher,
  } = {
    ...args,
    ...props,
  }
  const teams = teamsProp ?? TEAMS
  const quests = questsProp ?? QUESTS
  const [localItems, setLocalItems] = useState<Submission[]>(SUBMISSIONS)
  const items = submissionsProp ?? localItems
  const [filter, setFilter] = useState(filterArg)
  const [selected, setSelected] = useState(selectedArg)
  const [feedback, setFeedback] = useState('')
  useEffect(() => setFilter(filterArg), [filterArg])
  useEffect(() => setSelected(selectedArg), [selectedArg])

  const pending = items.filter((s) => s.status === 'pending')
  const reviewed = items.filter((s) => s.status !== 'pending')
  const list = filter === 'pending' ? pending : reviewed
  const current = items.find((s) => s.id === selected) ?? list[0]

  useEffect(() => setFeedback(current?.feedback ?? ''), [current?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const decide = async (status: SubmissionStatus) => {
    if (!current) return
    if (onReviewSubmission) {
      const saved = await onReviewSubmission(current.id, status, feedback || undefined)
      if (saved === false) return
    } else {
      setLocalItems((all) => all.map((s) => (s.id === current.id ? { ...s, status, feedback: feedback || undefined } : s)))
    }
    const next = pending.find((s) => s.id !== current.id)
    if (status !== 'pending' && next) setSelected(next.id)
  }

  return (
    <AdminShell
      active="review"
      questsOpen={questsOpen}
      pendingCount={pending.length}
      onNavigate={onNavigate}
      onToggleQuests={onToggleQuests}
      onLogout={onLogout}
      teacher={teacher}
    >
      <div className="grid h-full min-h-0 md:grid-cols-[320px_1fr]">
        {/* queue */}
        <section className="flex min-h-0 flex-col border-b border-line md:border-b-0 md:border-r">
          <div className="px-5 pt-5">
            <h1 className="font-display text-2xl font-semibold">ตรวจงาน</h1>
            <div className="mt-4 grid grid-cols-2 gap-1 rounded-lg border border-line bg-panel p-1">
              {[
                { id: 'pending', label: `รอตรวจ ${pending.length}` },
                { id: 'done', label: `ตรวจแล้ว ${reviewed.length}` },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setFilter(t.id)
                    const first = (t.id === 'pending' ? pending : reviewed)[0]
                    if (first) setSelected(first.id)
                  }}
                  className={[
                    'h-9 whitespace-nowrap rounded-md text-sm font-medium transition-colors duration-150',
                    filter === t.id ? 'bg-panel-2 text-fg' : 'text-muted hover:text-fg',
                  ].join(' ')}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <ul className="mt-3 max-h-64 min-h-0 flex-1 overflow-y-auto px-3 pb-4 md:max-h-none">
            {list.length === 0 && (
              <li className="px-2 py-6 text-center text-sm text-muted">
                {filter === 'pending' ? 'ตรวจครบทุกงานแล้ว' : 'ยังไม่มีงานที่ตรวจแล้ว'}
              </li>
            )}
            {list.map((s) => {
              const team = teams.find((t) => t.id === s.teamId)
              const quest = quests.find((q) => q.no === s.questNo)
              if (!team || !quest) return null
              const active = current?.id === s.id
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(s.id)}
                    className={[
                      'flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left transition-colors duration-150',
                      active ? 'bg-panel-2' : 'hover:bg-panel',
                    ].join(' ')}
                  >
                    <img src={COVERS[team.cover]} alt="" className="img-pixel size-10 shrink-0 rounded-md object-cover" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{team.name}</span>
                      <span className="block truncate text-xs text-muted">
                        ภารกิจ {quest.no} · {quest.title}
                      </span>
                    </span>
                    <StatusDot status={s.status} />
                  </button>
                </li>
              )
            })}
          </ul>
        </section>

        {/* detail */}
        <section className="min-h-0 overflow-y-auto">
          {current ? (
            <Detail
              submission={current}
              feedback={feedback}
              onFeedback={setFeedback}
              onApprove={() => void decide('approved')}
              onReject={() => void decide('rejected')}
              onUndo={() => void decide('pending')}
              teams={teams}
              quests={quests}
            />
          ) : (
            <p className="p-8 text-sm text-muted">เลือกงานทางซ้ายเพื่อตรวจ</p>
          )}
        </section>
      </div>
    </AdminShell>
  )
}

function Detail({
  submission: s,
  feedback,
  onFeedback,
  onApprove,
  onReject,
  onUndo,
  teams,
  quests,
}: {
  submission: Submission
  feedback: string
  onFeedback: (v: string) => void
  onApprove: () => void
  onReject: () => void
  onUndo: () => void
  teams: Team[]
  quests: Quest[]
}) {
  const team = teams.find((t) => t.id === s.teamId)
  const quest = quests.find((q) => q.no === s.questNo)
  if (!team || !quest) throw new Error(`ไม่พบทีม/ภารกิจของงานส่ง ${s.id}`)
  const a = s.answer

  return (
    <div className="mx-auto max-w-3xl p-5 md:p-8">
      <p className="text-sm text-muted">
        {team.name} · ส่งโดย {s.submittedBy} · {s.submittedAt}
      </p>
      <h2 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">
        ภารกิจ {quest.no}: {quest.title}
      </h2>
      <p className="mt-2 text-sm text-muted">{quest.detail}</p>

      <div className="mt-6 rounded-xl border border-line bg-panel p-4 sm:p-5">
        {a.kind === 'text' && <p className="whitespace-pre-line leading-relaxed">{a.body}</p>}
        {a.kind === 'link' && (
          <div>
            <a
              href={a.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex max-w-full items-center gap-2 break-all text-sky underline-offset-4 hover:underline"
            >
              <ExternalLink className="size-4 shrink-0" /> {a.url}
            </a>
            {a.note && <p className="mt-2 text-sm text-muted">{a.note}</p>}
          </div>
        )}
        {a.kind === 'file' && (
          <div>
            {a.video && a.url && (
              <video controls src={a.url} className="aspect-video w-full rounded-lg bg-ink" />
            )}
            {a.preview && (
              <div className="relative overflow-hidden rounded-lg">
                {!a.video && <img src={a.preview} alt="" className="img-pixel aspect-video w-full object-cover" />}
                {a.video && !a.url && (
                  <span className="absolute inset-0 grid place-items-center bg-ink/40">
                    <span className="grid size-14 place-items-center rounded-full bg-fg text-ink">
                      <Play className="size-6 translate-x-0.5" />
                    </span>
                  </span>
                )}
              </div>
            )}
            <p className="mt-3 flex items-center gap-2 text-sm">
              <FileText className="size-4 text-muted" />
              <span className="min-w-0 truncate">{a.name}</span>
              <span className="text-muted">· {a.size}</span>
            </p>
            {a.url && (
              <a href={a.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-sm text-sky underline-offset-4 hover:underline">
              เปิดหรือดาวน์โหลดไฟล์
              </a>
            )}
            {a.accessError && <p role="alert" className="mt-2 text-sm text-rose">เปิดไฟล์แนบไม่ได้: {a.accessError}</p>}
          </div>
        )}
        {a.kind === 'invalid' && (
          <div role="alert">
            <p className="font-medium text-rose">คำตอบนี้มีรูปแบบข้อมูลที่ระบบไม่รองรับ แต่ยังตรวจผ่านหรือส่งกลับให้ทีมแก้ไขได้</p>
            <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-md bg-ink p-3 text-xs text-muted">{a.raw}</pre>
          </div>
        )}
      </div>

      <label htmlFor="feedback" className="mt-6 block text-sm font-medium">
        ความเห็นถึงทีม
      </label>
      <textarea
        id="feedback"
        rows={3}
        value={feedback}
        onChange={(e) => onFeedback(e.target.value)}
        disabled={s.status !== 'pending'}
        placeholder="เช่น ทำได้ดีมาก / ช่วยแก้ส่วนนี้แล้วส่งใหม่"
        className="mt-2 w-full resize-none rounded-md border border-line bg-ink px-3 py-2 text-sm placeholder:text-muted focus:border-lime focus:outline-none disabled:opacity-70"
      />

      {s.status === 'pending' ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onApprove}
            className="flex h-11 items-center gap-2 rounded-md bg-lime px-5 text-sm font-semibold text-ink transition-[transform,background-color] duration-150 hover:bg-[#d6f86a] active:scale-[0.98]"
          >
            <Check className="size-4" /> ผ่าน · ปลดล็อกภารกิจถัดไป
          </button>
          <button
            type="button"
            onClick={onReject}
            className="flex h-11 items-center gap-2 rounded-md border border-line px-5 text-sm text-rose transition-colors duration-150 hover:bg-panel"
          >
            <X className="size-4" /> ให้แก้ไข
          </button>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span
            className={[
              'rounded-md px-3 py-1.5 text-sm font-medium',
              s.status === 'approved' ? 'bg-lime/15 text-lime' : 'bg-rose/15 text-rose',
            ].join(' ')}
          >
            {s.status === 'approved' ? 'ผ่านแล้ว' : 'ส่งกลับให้แก้ไข'}
          </span>
          <button
            type="button"
            onClick={onUndo}
            className="flex items-center gap-1.5 text-sm text-muted transition-colors duration-150 hover:text-fg"
          >
            <RotateCcw className="size-3.5" /> ยกเลิกผลตรวจ
          </button>
        </div>
      )}
    </div>
  )
}

function StatusDot({ status }: { status: SubmissionStatus }) {
  const cls = status === 'pending' ? 'bg-amber' : status === 'approved' ? 'bg-lime' : 'bg-rose'
  return <span className={`size-2 shrink-0 rounded-full ${cls}`} aria-label={status} />
}
