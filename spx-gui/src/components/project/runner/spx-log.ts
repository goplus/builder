import dayjs from 'dayjs'
import type { TextDocumentRange } from '@/components/xgo-code-editor'
import type { ProjectRunnerLocation, ProjectRunnerOutput } from './types'

// Check tools/ispx/log.go for the log source.
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

function toSourceRange(file: string, line: number, column: number): TextDocumentRange {
  return {
    textDocument: { uri: `file:///${file}` },
    range: {
      start: { line, column },
      end: { line, column }
    }
  }
}

type SpxConsoleLogEvent =
  | { type: 'output'; output: ProjectRunnerOutput }
  | { type: 'location'; location: ProjectRunnerLocation }
  | { type: 'unknown' }

export function parseSpxConsoleLog(jsonStr: string): SpxConsoleLogEvent | null {
  const log = parseSpxLog(jsonStr)
  if (log == null) return null
  if (isSpxLocationLog(log)) {
    return {
      type: 'location',
      location: { textDocument: { uri: `file:///${log.file}` }, line: log.line }
    }
  }
  if (isSpxInfoLog(log)) {
    return {
      type: 'output',
      output: {
        kind: 'log',
        time: dayjs(log.time).valueOf(),
        message: log.msg,
        source: toSourceRange(log.file, log.line, 1)
      }
    }
  }
  if (isSpxPanicLog(log)) {
    return {
      type: 'output',
      output: {
        kind: 'error',
        time: dayjs(log.time).valueOf(),
        message: log.error,
        source: toSourceRange(log.file, log.line, log.column)
      }
    }
  }
  return { type: 'unknown' }
}
