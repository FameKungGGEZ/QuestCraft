import { useState } from 'react'
import { QUESTS, Quest } from './data'

export const MAX_QUESTS = 20

export type QuestDraft = Omit<Quest, 'no' | 'x' | 'y'> & { exampleFile?: File }

/* A winding path: rows of PER_ROW stops that snake left→right, then right→left,
   with a gentle wave so it reads as a trail rather than a grid. */
const PER_ROW = 5
const GAP_X = 360
const GAP_Y = 320
const PAD = 220

export function layoutQuests(list: Omit<Quest, 'x' | 'y'>[]): Quest[] {
  return list.map((q, i) => {
    const row = Math.floor(i / PER_ROW)
    const col = i % PER_ROW
    const c = row % 2 === 0 ? col : PER_ROW - 1 - col
    const wave = col % 2 === 0 ? 0 : 70
    return { ...q, no: i + 1, x: PAD + c * GAP_X, y: PAD + row * GAP_Y + wave }
  })
}

export function mapSizeFor(count: number) {
  const rows = Math.max(1, Math.ceil(count / PER_ROW))
  return {
    width: PAD * 2 + (PER_ROW - 1) * GAP_X,
    height: PAD * 2 + (rows - 1) * GAP_Y + 70,
  }
}

export const DEFAULT_QUESTS: Quest[] = layoutQuests(QUESTS)

export type QuestStore = {
  quests: Quest[]
  add: (q: QuestDraft) => number
  update: (no: number, q: QuestDraft) => void
  remove: (no: number) => void
}

export function useQuestStore(initial: Quest[] = DEFAULT_QUESTS): QuestStore {
  const [quests, setQuests] = useState<Quest[]>(initial)
  const add = (q: QuestDraft) => {
    if (quests.length >= MAX_QUESTS) return quests.length
    setQuests((l) => layoutQuests([...l, { ...q, no: l.length + 1 }]))
    return quests.length + 1
  }
  const update = (no: number, q: QuestDraft) =>
    setQuests((l) => layoutQuests(l.map((x) => (x.no === no ? { ...x, ...q } : x))))
  const remove = (no: number) => setQuests((l) => layoutQuests(l.filter((x) => x.no !== no)))
  return { quests, add, update, remove }
}
