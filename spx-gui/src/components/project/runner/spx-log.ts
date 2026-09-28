// Check tools/ispx/log.go for the log source.
export const spxLocationLogMessage = '__spx_loc__'

export type SpxLog = {
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'
  /** RFC 3339 date time string, e.g., `2025-12-04T14:17:36.24+08:00` */
  time: string
  msg: string
  [key: string]: unknown
}

function isSpxLog(obj: any): obj is SpxLog {
  return (
    obj != null &&
    typeof obj === 'object' &&
    typeof obj.level === 'string' &&
    typeof obj.time === 'string' &&
    typeof obj.msg === 'string'
  )
}

export function parseSpxLog(jsonStr: string): SpxLog | null {
  try {
    const obj = JSON.parse(jsonStr)
    if (isSpxLog(obj)) return obj
  } catch {
    // ignore
  }
  return null
}

export type SpxInfoLog = SpxLog & {
  level: 'INFO'
  function: string
  /** Source file name, e.g., `NiuXiaoQi.spx` */
  file: string
  /** Source code line number, starting from 1 */
  line: number
}

export function isSpxInfoLog(obj: SpxLog): obj is SpxInfoLog {
  return obj.level === 'INFO' && obj.msg !== spxLocationLogMessage
}

export type SpxPanicLog = SpxLog & {
  level: 'ERROR'
  msg: 'panic'
  /** Panic error message */
  error: string
  /** Source file name, e.g., `NiuXiaoQi.spx` */
  file: string
  /** Source code line number, starting from 1 */
  line: number
  /** Source code column number, starting from 1 */
  column: number
}

export function isSpxPanicLog(obj: SpxLog): obj is SpxPanicLog {
  return obj.level === 'ERROR' && typeof obj.error === 'string' && obj.msg === 'panic'
}

export type SpxLocationLog = SpxLog & {
  msg: typeof spxLocationLogMessage
  file: string
  line: number
}

export function isSpxLocationLog(log: SpxLog): log is SpxLocationLog {
  return log.msg === spxLocationLogMessage && typeof log.file === 'string' && typeof log.line === 'number'
}
