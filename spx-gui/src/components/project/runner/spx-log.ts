// SPX runtime log format is defined in tools/ispx/log.go.
/** The SPX source line currently being executed by the runner. */
export type SpxExecutionLocation = {
  file: string
  /** Line number, starting from 1. */
  line: number
}

const spxLocationLogMessage = '__spx_loc__'

type SpxLogBase = {
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'
  /** RFC 3339 date time string, e.g., `2025-12-04T14:17:36.24+08:00` */
  time: string
  msg: string
  [key: string]: unknown
}

function isSpxLogBase(obj: unknown): obj is SpxLogBase {
  return (
    obj != null &&
    typeof obj === 'object' &&
    'level' in obj &&
    typeof obj.level === 'string' &&
    'time' in obj &&
    typeof obj.time === 'string' &&
    'msg' in obj &&
    typeof obj.msg === 'string'
  )
}

type SpxInfoLog = SpxLogBase & {
  level: 'INFO'
  function: string
  /** Source file name, e.g., `NiuXiaoQi.spx` */
  file: string
  /** Source code line number, starting from 1 */
  line: number
}

function isSpxInfoLog(obj: SpxLogBase): obj is SpxInfoLog {
  return obj.level === 'INFO' && obj.msg !== spxLocationLogMessage
}

type SpxPanicLog = SpxLogBase & {
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

/** An SPX source log emitted by the runner. */
export type SpxLog = SpxInfoLog | SpxPanicLog

function isSpxPanicLog(obj: SpxLogBase): obj is SpxPanicLog {
  return obj.level === 'ERROR' && typeof obj.error === 'string' && obj.msg === 'panic'
}

type SpxLocationLog = SpxLogBase & {
  msg: typeof spxLocationLogMessage
  file: string
  line: number
}

function isSpxLocationLog(log: SpxLogBase): log is SpxLocationLog {
  return log.msg === spxLocationLogMessage && typeof log.file === 'string' && typeof log.line === 'number'
}

type ParsedSpxLog =
  | { type: 'log'; log: SpxLog }
  | { type: 'executionLocation'; executionLocation: SpxExecutionLocation }

export function parseSpxLog(jsonStr: string): ParsedSpxLog | null {
  if (!jsonStr.startsWith('{')) return null
  try {
    const log = JSON.parse(jsonStr)
    if (!isSpxLogBase(log)) return null
    if (isSpxLocationLog(log)) {
      return {
        type: 'executionLocation',
        executionLocation: { file: log.file, line: log.line }
      }
    }
    if (isSpxInfoLog(log) || isSpxPanicLog(log)) return { type: 'log', log }
  } catch {
    // Ignore unrelated console messages.
  }
  return null
}
