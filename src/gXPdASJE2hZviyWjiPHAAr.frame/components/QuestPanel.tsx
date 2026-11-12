import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileUp,
  Link2,
  Lock,
  Play,
  Send,
  Type,
  X,
} from 'lucide-react'
import { ANSWER_LABEL, AnswerType, Quest } from '../../shared/quest/data'
import { AnswerDraft, Submission } from '../../shared/quest/submissions'
import {
  getAllowedSubmissionFileTypes,
  getSubmissionFileAccept,
  isSubmissionFileAllowed,
} from '../../shared/quest/submissionFiles'

export type NodeStatus = 'cleared' | 'active' | 'pending' | 'rejected' | 'locked'

type Props = {
  quest: Quest
  status: NodeStatus
  submission?: Submission
  onClose: () => void
  onSubmit?: (answer: AnswerDraft) => void
  onCancelSubmission?: (submissionId: string) => Promise<boolean>
}

const ease = [0.23, 1, 0.32, 1] as const

export function QuestPanel({ quest, status, submission, onClose, onSubmit, onCancelSubmission }: Props) {
  return (
    <motion.aside
      data-no-pan
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.22, ease }}
      className="absolute inset-x-0 bottom-0 z-20 flex max-h-[78%] cursor-auto flex-col rounded-t-xl border border-line bg-panel sm:inset-x-auto sm:bottom-3 sm:left-3 sm:top-3 sm:max-h-none sm:w-[420px] sm:rounded-xl lg:left-5 lg:top-5 lg:bottom-5"
    >
      <header className="flex items-start gap-3 border-b border-line p-5">
        <div className="min-w-0 flex-1">
          <p className="font-pixel text-sm text-muted">ด่าน {quest.no}</p>
          <h2 className="mt-0.5 font-display text-2xl font-semibold leading-tight">{quest.title}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="ปิด"
          className="grid size-9 shrink-0 place-items-center rounded-md text-muted transition-colors duration-150 hover:bg-panel-2 hover:text-fg"
        >
          <X className="size-4" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {status === 'locked' ? (
          <div className="flex flex-col items-center py-10 text-center">
            <span className="grid size-14 place-items-center rounded-xl border-2 border-line text-muted">
              <Lock className="size-6" />
            </span>
            <p className="mt-4 font-medium">ยังไม่ปลดล็อค</p>
            <p className="mt-1 max-w-[260px] text-sm text-muted">
              ผ่านด่านก่อนหน้าให้ครูตรวจผ่านก่อน รายละเอียดด่านนี้จะเปิดให้เห็น
            </p>
          </div>
        ) : (
          <>
            <p className="text-[15px] leading-relaxed text-fg/90">{quest.detail}</p>

            {quest.example && (
              <figure className="mt-5">
                <div className="relative aspect-video overflow-hidden rounded-lg border border-line">
                  <img src={quest.example.src} alt="" className="img-pixel size-full object-cover" />
                  {quest.example.kind === 'video' && (
                    <button
                      type="button"
                      aria-label="เล่นคลิปตัวอย่าง"
                      className="absolute inset-0 grid place-items-center bg-ink/30 transition-colors duration-150 hover:bg-ink/10"
                    >
                      <span className="grid size-12 place-items-center rounded-full bg-fg text-ink">
                        <Play className="ml-0.5 size-5 fill-current" />
                      </span>
                    </button>
                  )}
                </div>
                <figcaption className="mt-2 text-xs text-muted">{quest.example.caption}</figcaption>
              </figure>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted">ส่งเป็น</span>
              {quest.accepts.map((a) => (
                <span key={a} className="rounded-md bg-panel-2 px-2 py-0.5 font-medium">
                  {ANSWER_LABEL[a]}
                  {a === 'file' ? ` (${getAllowedSubmissionFileTypes(quest.fileTypes).join(', ')})` : ''}
                </span>
              ))}
            </div>

            <div className="mt-6 border-t border-line pt-6">
              {status === 'cleared' && <Cleared />}
              {status === 'pending' && (
                <Pending submission={submission} onCancel={onCancelSubmission} />
              )}
              {(status === 'active' || status === 'rejected') && (
                <AnswerForm
                  quest={quest}
                  rejected={status === 'rejected'}
                  rejectedFeedback={submission?.feedback}
                  onSubmit={onSubmit}
                />
              )}
            </div>
          </>
        )}
      </div>
    </motion.aside>
  )
}

function Cleared() {
  return (
    <div className="flex gap-3 rounded-lg bg-lime/10 p-4">
      <CheckCircle2 className="size-5 shrink-0 text-lime" />
      <div className="text-sm">
        <p className="font-medium text-lime">ครูตรวจผ่านแล้ว</p>
        <p className="mt-1 text-muted">ปลดล็อกภารกิจถัดไปเรียบร้อย</p>
      </div>
    </div>
  )
}

function Pending({
  submission,
  onCancel,
}: {
  submission?: Submission
  onCancel?: (submissionId: string) => Promise<boolean>
}) {
  const [cancelling, setCancelling] = useState(false)
  if (submission) {
    const answer = submission.answer
    const summary = answer.kind === 'text'
      ? answer.body
      : answer.kind === 'link'
        ? answer.url
        : answer.kind === 'file'
          ? `${answer.name} · ${answer.size}`
          : 'คำตอบเดิมมีรูปแบบที่ไม่รองรับ'
    return (
      <div>
        <div className="flex gap-3 rounded-lg border border-amber/40 bg-amber/10 p-4">
          <Clock className="size-5 shrink-0 text-amber" />
          <div className="text-sm">
            <p className="font-medium text-amber">ส่งแล้ว · รอครูตรวจ</p>
            <p className="mt-1 text-fg/80">สมาชิกในทีมเห็นคำตอบนี้ได้ และยกเลิกการส่งได้ก่อนครูตรวจ</p>
          </div>
        </div>
        <p className="mb-2 mt-5 text-sm text-muted">
          คำตอบที่ส่งโดย {submission.submittedBy} · {submission.submittedAt}
        </p>
        <div className="rounded-lg border border-line bg-panel-2 p-3 text-sm">
          {answer.kind === 'link' ? (
            <a href={answer.url} target="_blank" rel="noreferrer" className="break-all text-sky underline-offset-4 hover:underline">
              {summary}
            </a>
          ) : answer.kind === 'file' && answer.url ? (
            <a href={answer.url} target="_blank" rel="noreferrer" className="break-all text-sky underline-offset-4 hover:underline">
              เปิดไฟล์ · {summary}
            </a>
          ) : (
            <p className="whitespace-pre-line break-all">{summary}</p>
          )}
        </div>
        {answer.kind === 'file' && answer.accessError && (
          <p role="alert" className="mt-2 text-sm text-rose">เปิดไฟล์แนบไม่ได้: {answer.accessError}</p>
        )}
        {onCancel && (
          <button
            type="button"
            disabled={cancelling}
            onClick={async () => {
              setCancelling(true)
              try {
                await onCancel(submission.id)
              } finally {
                setCancelling(false)
              }
            }}
            className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-md border border-rose/50 text-sm font-semibold text-rose transition-colors duration-150 hover:bg-rose/10 disabled:opacity-60"
          >
            <X className="size-4" />
            {cancelling ? 'กำลังยกเลิก…' : 'ยกเลิกการส่ง'}
          </button>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="flex gap-3 rounded-lg border border-rose/40 bg-rose/10 p-4">
        <AlertTriangle className="size-5 shrink-0 text-rose" />
        <div className="text-sm">
          <p className="font-medium text-rose">ไม่พบข้อมูลงานส่ง</p>
          <p className="mt-1 text-fg/80">สถานะภารกิจกับรายการงานส่งไม่ตรงกัน กรุณาโหลดหน้าใหม่หรือติดต่อครู</p>
        </div>
      </div>
    </div>
  )
}

function AnswerForm({
  quest,
  rejected,
  rejectedFeedback,
  onSubmit,
}: {
  quest: Quest
  rejected: boolean
  rejectedFeedback?: string
  onSubmit?: (answer: AnswerDraft) => void
}) {
  const [type, setType] = useState<AnswerType>(quest.accepts[0])
  const [confirming, setConfirming] = useState(false)
  const [text, setText] = useState('')
  const [url, setUrl] = useState('')
  const [note, setNote] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const allowedFileTypes = getAllowedSubmissionFileTypes(quest.fileTypes)
  const icons = { file: FileUp, link: Link2, text: Type }
  const buildAnswer = (): AnswerDraft | null => {
    setError('')
    if (type === 'text') {
      if (!text.trim()) {
        setError('กรุณาพิมพ์คำตอบก่อนส่ง')
        return null
      }
      return { kind: 'text', body: text.trim() }
    }
    if (type === 'link') {
      try {
        const parsed = new URL(url)
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error()
      } catch {
        setError('กรุณาใส่ลิงก์ที่ขึ้นต้นด้วย http:// หรือ https://')
        return null
      }
      return { kind: 'link', url, note: note.trim() || undefined }
    }
    if (!file) {
      setError('กรุณาเลือกไฟล์ก่อนส่ง')
      return null
    }
    if (!isSubmissionFileAllowed(file.name, allowedFileTypes)) {
      setError(`รองรับไฟล์ประเภท ${allowedFileTypes.join(', ')} เท่านั้น`)
      return null
    }
    return { kind: 'file-upload', file }
  }

  return (
    <div>
      {rejected && (
        <div className="mb-5 flex gap-3 rounded-lg border border-rose/40 bg-rose/10 p-4">
          <AlertTriangle className="size-5 shrink-0 text-rose" />
          <div className="text-sm">
            <p className="font-medium text-rose">ครูปฏิเสธ · ส่งใหม่ได้</p>
            <p className="mt-1 text-fg/80">
              {rejectedFeedback || 'แก้ไขคำตอบตามคำแนะนำของครูแล้วส่งใหม่ได้'}
            </p>
          </div>
        </div>
      )}

      <p className="font-medium">{rejected ? 'ส่งคำตอบใหม่' : 'ส่งคำตอบของทีม'}</p>

      {quest.accepts.length > 1 && (
        <div className="mt-3 flex rounded-md bg-panel-2 p-1">
          {quest.accepts.map((a) => {
            const Icon = icons[a]
            return (
              <button
                key={a}
                type="button"
                onClick={() => setType(a)}
                className={[
                  'flex h-8 flex-1 items-center justify-center gap-1.5 rounded text-sm transition-colors duration-150',
                  type === a ? 'bg-ink text-fg' : 'text-muted hover:text-fg',
                ].join(' ')}
              >
                <Icon className="size-3.5" /> {ANSWER_LABEL[a]}
              </button>
            )
          })}
        </div>
      )}

      <div className="mt-3">
        {type === 'file' && (
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-line px-4 py-7 text-center transition-colors duration-150 hover:border-lime">
            <FileUp className="size-6 text-muted" />
            <span className="text-sm font-medium">ลากไฟล์มาวาง หรือกดเพื่อเลือก</span>
            <span className="text-xs text-muted">
              {file ? `${file.name} · ${(file.size / (1024 * 1024)).toFixed(1)} MB` : `รับ ${allowedFileTypes.join(', ')} · ไม่เกิน 100 MB`}
            </span>
            <input
              type="file"
              accept={getSubmissionFileAccept(allowedFileTypes)}
              className="hidden"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null)
                setError('')
              }}
            />
          </label>
        )}
        {type === 'link' && (
          <div className="space-y-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://scratch.mit.edu/projects/…"
              className="h-11 w-full rounded-md border border-line bg-ink px-3 text-sm outline-none transition-colors duration-150 focus:border-lime"
            />
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="หมายเหตุ (ไม่บังคับ)"
              className="h-11 w-full rounded-md border border-line bg-ink px-3 text-sm outline-none transition-colors duration-150 focus:border-lime"
            />
          </div>
        )}
        {type === 'text' && (
          <textarea
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="พิมพ์คำตอบของทีม…"
            className="w-full resize-none rounded-md border border-line bg-ink p-3 text-sm outline-none transition-colors duration-150 focus:border-lime"
          />
        )}
      </div>

      {error && <p role="alert" className="mt-2 text-sm text-rose">{error}</p>}

      {confirming ? (
        <div className="mt-4 rounded-lg border border-amber/40 bg-amber/10 p-4">
          <p className="text-sm text-fg/90">
            ส่งแล้ว<span className="font-semibold text-amber">ยกเลิกไม่ได้</span>
            จนกว่าครูจะตรวจ แน่ใจไหม?
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="h-10 flex-1 rounded-md border border-line text-sm font-medium transition-colors duration-150 hover:bg-panel-2"
            >
              กลับไปแก้
            </button>
            <button
              type="button"
              onClick={() => {
                const answer = buildAnswer()
                if (!answer) return
                setConfirming(false)
                onSubmit?.(answer)
              }}
              className="h-10 flex-1 rounded-md bg-lime text-sm font-semibold text-ink transition-[transform,background-color] duration-150 hover:bg-[#d6f86a] active:scale-[0.98]"
            >
              ยืนยันส่ง
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            if (buildAnswer()) setConfirming(true)
          }}
          className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-lime font-display font-semibold text-ink transition-[transform,background-color] duration-150 hover:bg-[#d6f86a] active:scale-[0.98]"
        >
          <Send className="size-4" /> ส่งภารกิจ
        </button>
      )}
    </div>
  )
}
