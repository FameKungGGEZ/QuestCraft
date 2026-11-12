export const SUBMISSION_FILE_TYPES = ['PNG', 'JPG', 'PDF', 'MP4', 'MOV', 'DOCX', 'ZIP'] as const

export type SubmissionFileType = (typeof SUBMISSION_FILE_TYPES)[number]

const FILE_FORMATS: Record<SubmissionFileType, { extensions: readonly string[]; contentType: string }> = {
  PNG: { extensions: ['png'], contentType: 'image/png' },
  JPG: { extensions: ['jpg', 'jpeg'], contentType: 'image/jpeg' },
  PDF: { extensions: ['pdf'], contentType: 'application/pdf' },
  MP4: { extensions: ['mp4'], contentType: 'video/mp4' },
  MOV: { extensions: ['mov'], contentType: 'video/quicktime' },
  DOCX: {
    extensions: ['docx'],
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  },
  ZIP: { extensions: ['zip'], contentType: 'application/zip' },
}

export function getAllowedSubmissionFileTypes(fileTypes?: readonly string[]): SubmissionFileType[] {
  if (!fileTypes?.length) return [...SUBMISSION_FILE_TYPES]
  const configured = fileTypes.map((type) => type.trim().toUpperCase())
  if (configured.includes('JPEG')) configured.push('JPG')
  return SUBMISSION_FILE_TYPES.filter((type) => configured.includes(type))
}

export function getSubmissionFileAccept(fileTypes?: readonly string[]): string {
  const extensions = getAllowedSubmissionFileTypes(fileTypes)
    .flatMap((type) => FILE_FORMATS[type].extensions)
  return Array.from(new Set(extensions), (extension) => `.${extension}`).join(',')
}

export function getSubmissionFileType(fileName: string): SubmissionFileType | null {
  const extension = fileName.match(/\.([^.]+)$/)?.[1].toLowerCase()
  if (!extension) return null
  return SUBMISSION_FILE_TYPES.find((type) => FILE_FORMATS[type].extensions.includes(extension)) ?? null
}

export function isSubmissionFileAllowed(fileName: string, fileTypes?: readonly string[]): boolean {
  const fileType = getSubmissionFileType(fileName)
  return fileType !== null && getAllowedSubmissionFileTypes(fileTypes).includes(fileType)
}

export function getSubmissionFileContentType(fileName: string): string | null {
  const fileType = getSubmissionFileType(fileName)
  return fileType ? FILE_FORMATS[fileType].contentType : null
}
