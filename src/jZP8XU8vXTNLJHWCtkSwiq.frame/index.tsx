import React, { useEffect, useState } from 'react'
import { Check, FileUp, ImagePlus, Link2, Plus, Trash2, Type, Video, X } from 'lucide-react'
import { AdminShell, AdminTab } from '../shared/quest/AdminShell'
import { inputClass } from '../shared/quest/AuthLayout'
import { ANSWER_LABEL, AnswerType, Quest, TEAMS, Team } from '../shared/quest/data'
import { MAX_QUESTS, QuestDraft, QuestStore, useQuestStore } from '../shared/quest/questStore'
import { SUBMISSION_FILE_TYPES } from '../shared/quest/submissionFiles'

export const args = {
  selected: 0,
  questsOpen: true,
}

export const argTypes = {
  selected: { control: 'select', options: [0, 1] },
  // 0 opens the new-quest form
  questsOpen: { control: 'boolean' },
}

type Props = Partial<typeof args> & {
  onNavigate?: (tab: AdminTab) => void
  onToggleQuests?: (open: boolean) => void
  onLogout?: () => void
  teacher?: string
  pendingCount?: number
  onReview?: (questNo: number) => void
  quests?: Quest[]
  teams?: Team[]
  onSaveQuest?: (quest: QuestDraft, no?: number) => Promise<boolean>
  onDeleteQuest?: (no: number) => Promise<boolean>
  /** Quests shared with the students' map. */
  store?: QuestStore
}

const TYPE_ICON = { file: FileUp, link: Link2, text: Type }

export default function QuestManager(props: Props) {
  const {
    selected,
    questsOpen,
    onNavigate,
    onToggleQuests,
    onLogout,
    teacher,
    pendingCount,
    onReview,
    quests: questsProp,
    teams: teamsProp,
    onSaveQuest,
    onDeleteQuest,
    store: shared,
  } = {
    ...args,
    ...props,
  }
  const local = useQuestStore()
  const store = shared ?? local
  const QUESTS = questsProp ?? store.quests
  const teams = teamsProp ?? TEAMS
  const full = QUESTS.length >= MAX_QUESTS
  const [picked, setPicked] = useState(selected)
  useEffect(() => setPicked(selected), [selected])

  const quest = QUESTS.find((q) => q.no === picked)
  const isNew = !quest
  const [title, setTitle] = useState(quest?.title ?? '')
  const [detail, setDetail] = useState(quest?.detail ?? '')
  const [accepts, setAccepts] = useState<AnswerType[]>(quest?.accepts ?? ['file'])
  const [fileTypes, setFileTypes] = useState<string[]>(quest?.fileTypes ?? ['PNG', 'PDF'])
  const [example, setExample] = useState(quest?.example)
  const [exampleFile, setExampleFile] = useState<File>()
  const [examplePreviewUrl, setExamplePreviewUrl] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setTitle(quest?.title ?? '')
    setDetail(quest?.detail ?? '')
    setAccepts(quest?.accepts ?? ['file'])
    setFileTypes(quest?.fileTypes ?? ['PNG', 'PDF'])
    setExample(quest?.example)
    setExampleFile(undefined)
  }, [picked, quest?.no, quest?.example?.storagePath, quest?.example?.src]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!exampleFile) {
      setExamplePreviewUrl('')
      return
    }
    const url = URL.createObjectURL(exampleFile)
    setExamplePreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [exampleFile])

  useEffect(() => {
    if (!saved) return
    const t = window.setTimeout(() => setSaved(false), 1800)
    return () => window.clearTimeout(t)
  }, [saved])

  const canSave = title.trim().length > 0
  const save = async () => {
    if (!canSave) return
    const draft = {
      title: title.trim(),
      detail: detail.trim(),
      accepts,
      fileTypes: accepts.includes('file') ? fileTypes : undefined,
      example,
      exampleFile,
    }
    if (onSaveQuest) {
      if (!(await onSaveQuest(draft, quest?.no))) return
      if (!quest) setPicked(QUESTS.length + 1)
    } else if (quest) store.update(quest.no, draft)
    else if (!full) setPicked(store.add(draft))
    setSaved(true)
  }
  const remove = async () => {
    if (!quest) return
    if (onDeleteQuest) {
      if (!(await onDeleteQuest(quest.no))) return
    } else {
      store.remove(quest.no)
    }
    setPicked(Math.max(1, Math.min(quest.no, QUESTS.length - 1)))
  }

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])
  const reachedBy = (no: number) => teams.filter((t) => t.cleared + 1 >= no).length
  const waiting = (no: number) => teams.filter((t) => t.pending === no).length

  return (
    <AdminShell
      active="quests"
      questsOpen={questsOpen}
      onNavigate={onNavigate}
      onToggleQuests={onToggleQuests}
      onLogout={onLogout}
      teacher={teacher}
      pendingCount={pendingCount}
    >
      <div className="flex h-full min-h-0 flex-col lg:flex-row">
        {/* quest list */}
        <section className="flex shrink-0 flex-col border-b border-line lg:w-80 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between px-5 py-4">
            <h1 className="font-display text-xl font-semibold">
              ภารกิจ{' '}
              <span className="font-pixel text-sm font-normal text-muted">
                {QUESTS.length}/{MAX_QUESTS}
              </span>
            </h1>
            <button
              type="button"
              onClick={() => setPicked(0)}
              disabled={full}
              title={full ? `สร้างได้สูงสุด ${MAX_QUESTS} ภารกิจ` : undefined}
              className="flex h-9 items-center gap-1.5 whitespace-nowrap rounded-md bg-lime px-3 text-sm font-semibold text-ink transition-[transform,background-color] duration-150 hover:bg-[#d6f86a] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="size-4" strokeWidth={2.5} /> เพิ่มภารกิจ
            </button>
          </div>
          <ol className="flex gap-2 overflow-x-auto px-3 pb-3 lg:flex-col lg:gap-0.5 lg:overflow-y-auto lg:overflow-x-visible">
            {QUESTS.map((q) => (
              <li key={q.no} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setPicked(q.no)}
                  className={[
                    'flex w-56 items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors duration-150 lg:w-full',
                    picked === q.no ? 'bg-panel-2' : 'hover:bg-panel',
                  ].join(' ')}
                >
                  <span className="w-6 font-pixel text-lg text-muted">{q.no}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{q.title}</span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                      {q.accepts.map((a) => {
                        const I = TYPE_ICON[a]
                        return <I key={a} className="size-3" />
                      })}
                      <span>· ถึงแล้ว {reachedBy(q.no)} ทีม</span>
                    </span>
                  </span>
                  {waiting(q.no) > 0 && (
                    <span className="rounded-full bg-amber px-1.5 font-pixel text-xs leading-5 text-ink">
                      {waiting(q.no)}
                    </span>
                  )}
                </button>
              </li>
            ))}
            {isNew && !full && (
              <li className="shrink-0">
                <div className="flex w-56 items-center gap-3 rounded-md border border-dashed border-lime/60 px-3 py-2.5 lg:w-full">
                  <span className="w-6 font-pixel text-lg text-lime">{QUESTS.length + 1}</span>
                  <span className="text-sm text-lime">ภารกิจใหม่</span>
                </div>
              </li>
            )}
          </ol>
        </section>

        {/* editor */}
        <section className="min-h-0 flex-1 overflow-y-auto">
          <form
            key={picked}
            onSubmit={(e) => {
              e.preventDefault()
              void save()
            }}
            className="mx-auto w-full max-w-3xl px-5 py-6 lg:px-10 lg:py-8"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-pixel text-sm text-muted">
                ด่าน {quest?.no ?? QUESTS.length + 1}
              </p>
              {quest && (
                <button
                  type="button"
                  onClick={() => onReview?.(quest.no)}
                  className="flex h-9 items-center gap-1.5 whitespace-nowrap rounded-md border border-line px-3 text-sm transition-colors duration-150 hover:bg-panel"
                >
                  ดูคำตอบของแต่ละทีม
                  {waiting(quest.no) > 0 && (
                    <span className="rounded-full bg-amber px-1.5 font-pixel text-xs leading-5 text-ink">
                      {waiting(quest.no)}
                    </span>
                  )}
                </button>
              )}
            </div>

            {isNew && full && (
              <p className="mt-3 rounded-md border border-amber/40 bg-panel px-3 py-2 text-sm text-amber">
                ครบ {MAX_QUESTS} ภารกิจแล้ว · ลบภารกิจเดิมก่อนจึงจะเพิ่มใหม่ได้
              </p>
            )}

            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="หัวข้อภารกิจ"
              className="mt-2 w-full bg-transparent font-display text-3xl font-semibold outline-none placeholder:text-muted/50"
            />

            <label className="mt-6 block">
              <span className="mb-1.5 block text-sm font-medium">รายละเอียด</span>
              <textarea
                rows={4}
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder="อธิบายว่าทีมต้องทำอะไร และส่งอะไร"
                className="w-full resize-y rounded-md border border-line bg-panel p-3 text-[15px] leading-relaxed outline-none transition-colors duration-150 focus:border-lime"
              />
            </label>

            {/* example media */}
            <div className="mt-6">
              <span className="mb-1.5 block text-sm font-medium">ตัวอย่าง (ภาพหรือคลิป)</span>
              {example ? (
                <div className="flex items-center gap-4 rounded-lg border border-line bg-panel p-3">
                  <div className="relative aspect-video w-36 shrink-0 overflow-hidden rounded-md">
                    {example.kind === 'video' && (
                      <video
                        src={exampleFile ? examplePreviewUrl : example.src}
                        controls
                        className="size-full object-cover"
                      />
                    )}
                    {example.kind === 'image' && (
                      <img
                        src={exampleFile ? examplePreviewUrl : example.src}
                        alt=""
                        className="img-pixel size-full object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-sm font-medium">
                      {example.kind === 'video' ? <Video className="size-4" /> : <ImagePlus className="size-4" />}
                      {example.kind === 'video' ? 'คลิปตัวอย่าง' : 'ภาพตัวอย่าง'}
                    </p>
                    <input
                      value={example.caption}
                      onChange={(event) => setExample({ ...example, caption: event.target.value })}
                      className="mt-1 w-full bg-transparent text-sm text-muted outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setExample(undefined)}
                    aria-label="ลบตัวอย่าง"
                    className="grid size-9 shrink-0 place-items-center rounded-md text-muted transition-colors duration-150 hover:bg-panel-2 hover:text-rose"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-line px-4 py-8 text-center transition-colors duration-150 hover:border-lime">
                  <span className="flex gap-2 text-muted">
                    <ImagePlus className="size-5" /> <Video className="size-5" />
                  </span>
                  <span className="text-sm font-medium">อัปโหลดภาพหรือคลิปตัวอย่าง</span>
                  <span className="text-xs text-muted">ไม่บังคับ · JPG, PNG, MP4, MOV ไม่เกิน 100 MB</span>
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.mp4,.mov"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (!file) return
                      const video = /\.(mp4|mov)$/i.test(file.name)
                      setExample({
                        kind: video ? 'video' : 'image',
                        src: '',
                        caption: '',
                      })
                      setExampleFile(file)
                      event.target.value = ''
                    }}
                  />
                </label>
              )}
            </div>

            {/* answer types */}
            <div className="mt-8 border-t border-line pt-6">
              <span className="block text-sm font-medium">นักเรียนส่งคำตอบเป็น</span>
              <span className="text-xs text-muted">เลือกได้มากกว่าหนึ่ง ทีมเลือกส่งแบบใดแบบหนึ่ง</span>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {(['file', 'link', 'text'] as AnswerType[]).map((a) => {
                  const on = accepts.includes(a)
                  const I = TYPE_ICON[a]
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAccepts((l) => (on && l.length === 1 ? l : toggle(l, a)))}
                      className={[
                        'flex h-12 items-center gap-2.5 rounded-md border px-3 text-sm font-medium transition-colors duration-150',
                        on ? 'border-lime bg-lime/10 text-fg' : 'border-line text-muted hover:text-fg',
                      ].join(' ')}
                    >
                      <I className="size-4" />
                      {ANSWER_LABEL[a]}
                      <span
                        className={[
                          'ml-auto grid size-5 place-items-center rounded',
                          on ? 'bg-lime text-ink' : 'border border-line',
                        ].join(' ')}
                      >
                        {on && <Check className="size-3.5" strokeWidth={3} />}
                      </span>
                    </button>
                  )
                })}
              </div>

              {accepts.includes('file') && (
                <div className="mt-4 rounded-lg bg-panel p-4">
                  <span className="text-sm text-muted">รับไฟล์ประเภท</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {SUBMISSION_FILE_TYPES.map((t) => {
                      const on = fileTypes.includes(t)
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setFileTypes((l) => toggle(l, t))}
                          className={[
                            'flex h-8 items-center gap-1 rounded-md px-2.5 font-mono text-xs transition-colors duration-150',
                            on ? 'bg-fg text-ink' : 'border border-line text-muted hover:text-fg',
                          ].join(' ')}
                        >
                          {t}
                          {on && <X className="size-3" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-end gap-3 border-t border-line pt-6">
              {quest && (
                <button
                  type="button"
                  onClick={() => void remove()}
                  className="mr-auto h-11 whitespace-nowrap rounded-md px-3 text-sm text-rose transition-colors duration-150 hover:bg-rose/10"
                >
                  ลบภารกิจ
                </button>
              )}
              {saved && <span className="text-sm text-lime">บันทึกแล้ว · อัปเดตแผนที่นักเรียนแล้ว</span>}
              <button
                type="submit"
                disabled={!canSave || (isNew && full)}
                className="h-11 whitespace-nowrap rounded-md bg-lime px-6 font-display font-semibold text-ink transition-[transform,background-color] duration-150 hover:bg-[#d6f86a] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isNew ? 'เผยแพร่ภารกิจ' : 'บันทึกการแก้ไข'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </AdminShell>
  )
}
