export const COVERS = {
  dragon: 'https://cdn.magicpatterns.com/patterns/generated-images/eebf3cca-9074-49cb-909d-793c17f0d074.jpg',
  space: 'https://cdn.magicpatterns.com/patterns/generated-images/0933164a-1156-42cd-ae39-f8cd3fdc44a4.jpg',
  forest: 'https://cdn.magicpatterns.com/patterns/generated-images/294f6f66-f198-4109-b5f6-920c09db9a52.jpg',
  city: 'https://cdn.magicpatterns.com/patterns/generated-images/91a9d7bd-aa6c-4ff6-b86a-198485ec1a12.jpg',
}

export const AUTH_ART =
  'https://cdn.magicpatterns.com/patterns/generated-images/f16a9917-55ef-4d4d-b705-0213653c5127.jpg'

export type CoverKey = keyof typeof COVERS

export type Member = { name: string; classroom: string; no: number }

export type Team = {
  id: string
  name: string
  cover: CoverKey
  owner: string
  ownerId?: string
  capacity: number
  members: Member[]
  /** Highest quest number approved. */
  cleared: number
  lastClearedAt?: string
  /** Quest number currently waiting for review, if any. */
  pending?: number
  lastSubmitAt: string
}

export type SpinState = {
  wheel: string[]
  done: string[]
  winner: string | null
}

export const TEAMS: Team[] = []

export type AnswerType = 'file' | 'link' | 'text'

export type Quest = {
  no: number
  title: string
  detail: string
  example?: { kind: 'image' | 'video'; src: string; caption: string }
  accepts: AnswerType[]
  fileTypes?: string[]
  /** Position on the quest map world, in px. */
  x: number
  y: number
}

export const QUESTS: Quest[] = []

export const MAP_SIZE = { width: 2000, height: 1160 }

export const ANSWER_LABEL: Record<AnswerType, string> = {
  file: 'ไฟล์',
  link: 'ลิงก์',
  text: 'ข้อความ',
}
