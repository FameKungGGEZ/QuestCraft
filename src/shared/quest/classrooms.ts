export function normalizeClassroom(value: string) {
  const normalized = value.trim().replace(/\s*\/\s*/g, '/')
  const parts = normalized.split('/')
  const grade = (parts[0] ?? '').replace(/^ม\.\s*/, '').trim()
  const room = (parts[1] ?? '').trim()
  if (parts.length !== 2 || !grade || !room) {
    throw new Error('กรอกชั้นและห้องในรูปแบบ ชั้น/ห้อง เช่น 5/2 หรือ 5/A')
  }
  if (!/\d/.test(grade)) {
    throw new Error('ส่วนหน้าของชั้นต้องมีตัวเลข')
  }
  return `${grade}/${room}`
}

export function compareClassrooms(left: string, right: string) {
  const a = splitClassroom(left)
  const b = splitClassroom(right)
  if (a.grade !== b.grade) return compareParts(a.grade, b.grade, true)
  return compareParts(a.room, b.room, false)
}

function splitClassroom(value: string) {
  const [grade = '', room = ''] = value.split('/')
  const gradeNumber = grade.match(/\d+/)?.[0]
  return {
    grade: gradeNumber ? Number(gradeNumber) : Number.POSITIVE_INFINITY,
    room,
  }
}

function compareParts(left: string | number, right: string | number, numericOnly: boolean) {
  if (numericOnly && (typeof left !== 'number' || typeof right !== 'number')) {
    return typeof left === 'number' ? -1 : typeof right === 'number' ? 1 : 0
  }
  if (!numericOnly) {
    const leftNumber = /^\d+$/.test(String(left))
    const rightNumber = /^\d+$/.test(String(right))
    if (leftNumber !== rightNumber) return leftNumber ? -1 : 1
    if (leftNumber && rightNumber) return Number(left) - Number(right)
  }
  return String(left).localeCompare(String(right), 'th', { numeric: true, sensitivity: 'base' })
}
