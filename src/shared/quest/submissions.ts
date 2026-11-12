export type SubmissionStatus = 'pending' | 'approved' | 'rejected'

export type SubmissionAnswer =
  | { kind: 'text'; body: string }
  | { kind: 'link'; url: string; note?: string }
  | {
      kind: 'file'
      name: string
      size: string
      preview?: string
      video?: boolean
      storagePath?: string
      url?: string
      contentType?: string
      accessError?: string
    }

export type Submission = {
  id: string
  teamId: string
  questNo: number
  submittedBy: string
  submittedAt: string
  status: SubmissionStatus
  answer: SubmissionAnswer | { kind: 'invalid'; raw: string }
  feedback?: string
}

export type AnswerDraft = SubmissionAnswer | { kind: 'file-upload'; file: File }

export function decodeSubmissionAnswer(value: unknown): unknown {
  let parsed = value
  for (let depth = 0; depth < 3 && typeof parsed === 'string'; depth += 1) {
    try {
      parsed = JSON.parse(parsed) as unknown
    } catch {
      break
    }
  }
  return parsed
}

export function parseSubmissionAnswer(value: unknown): Submission['answer'] {
  const parsedValue = decodeSubmissionAnswer(value)
  if (parsedValue && typeof parsedValue === 'object' && !Array.isArray(parsedValue)) {
    const answer = parsedValue as Record<string, unknown>
    if (answer.kind === 'text' && typeof answer.body === 'string') {
      return { kind: 'text', body: answer.body }
    }
    if (answer.kind === 'link' && typeof answer.url === 'string') {
      return {
        kind: 'link',
        url: answer.url,
        ...(typeof answer.note === 'string' ? { note: answer.note } : {}),
      }
    }
    if (answer.kind === 'file' && typeof answer.name === 'string' && typeof answer.size === 'string') {
      return {
        kind: 'file',
        name: answer.name,
        size: answer.size,
        ...(typeof answer.preview === 'string' ? { preview: answer.preview } : {}),
        ...(typeof answer.video === 'boolean' ? { video: answer.video } : {}),
        ...(typeof answer.storagePath === 'string' ? { storagePath: answer.storagePath } : {}),
        ...(typeof answer.url === 'string' ? { url: answer.url } : {}),
        ...(typeof answer.contentType === 'string' ? { contentType: answer.contentType } : {}),
      }
    }
  }
  const serialized = JSON.stringify(value)
  const raw = typeof serialized === 'string' ? serialized : String(value)
  return { kind: 'invalid', raw: raw.length > 2000 ? `${raw.slice(0, 2000)}...` : raw }
}

export const SUBMISSIONS: Submission[] = []
