// SPX runtime log format is defined in tools/ispx/log.go.
import dayjs from 'dayjs'

/** A runner log or error with its position in an SPX source file. */
export type ProjectRunnerLog = {
  level: SpxLog['level']
  /** Timestamp in milliseconds. */
  time: number
  message: string
  source: { file: string; line: number; column: number }
}

/** The SPX source line currently being executed by the runner. */
export type ProjectRunnerExecutionLocation = {
  file: string
  /** Line number, starting from 1. */
  line: number
}

const spxLocationLogMessage = '__spx_loc__'

type SpxLog = {
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

function parseSpxLog(jsonStr: string): SpxLog | null {
  try {
    const obj = JSON.parse(jsonStr)
    if (isSpxLog(obj)) return obj
  } catch {
    // ignore
  }
  return null
}

type SpxInfoLog = SpxLog & {
  level: 'INFO'
  function: string
  /** Source file name, e.g., `NiuXiaoQi.spx` */
  file: string
  /** Source code line number, starting from 1 */
  line: number
}

function isSpxInfoLog(obj: SpxLog): obj is SpxInfoLog {
  return obj.level === 'INFO' && obj.msg !== spxLocationLogMessage
}

type SpxPanicLog = SpxLog & {
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

function isSpxPanicLog(obj: SpxLog): obj is SpxPanicLog {
  return obj.level === 'ERROR' && typeof obj.error === 'string' && obj.msg === 'panic'
}

type SpxLocationLog = SpxLog & {
  msg: typeof spxLocationLogMessage
  file: string
  line: number
}

function isSpxLocationLog(log: SpxLog): log is SpxLocationLog {
  return log.msg === spxLocationLogMessage && typeof log.file === 'string' && typeof log.line === 'number'
}

type SpxConsoleLogEvent =
  | { type: 'log'; log: ProjectRunnerLog }
  | { type: 'executionLocation'; executionLocation: ProjectRunnerExecutionLocation }
  | { type: 'unknown' }

export function parseSpxConsoleLog(jsonStr: string): SpxConsoleLogEvent | null {
  const log = parseSpxLog(jsonStr)
  if (log == null) return null
  if (isSpxLocationLog(log)) {
    return {
      type: 'executionLocation',
      executionLocation: { file: log.file, line: log.line }
    }
  }
  if (isSpxInfoLog(log)) {
    return {
      type: 'log',
      log: {
        level: log.level,
        time: dayjs(log.time).valueOf(),
        message: log.msg,
        source: { file: log.file, line: log.line, column: 1 }
      }
    }
  }
  if (isSpxPanicLog(log)) {
    return {
      type: 'log',
      log: {
        level: log.level,
        time: dayjs(log.time).valueOf(),
        message: log.error,
        source: { file: log.file, line: log.line, column: log.column }
      }
    }
  }
  return { type: 'unknown' }
}
