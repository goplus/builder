export type SpxLocationLog = Record<string, unknown> & {
  level: 'INFO'
  msg: '__spx_loc__'
  file: string
  line: number
}

export function isSpxLocationLog(log: { level: string; msg: string; [key: string]: unknown }): log is SpxLocationLog {
  return (
    log.level === 'INFO' &&
    log.msg === '__spx_loc__' &&
    typeof log.file === 'string' &&
    /^[^/\\]+\.spx$/.test(log.file) &&
    typeof log.line === 'number' &&
    Number.isSafeInteger(log.line) &&
    log.line > 0
  )
}
