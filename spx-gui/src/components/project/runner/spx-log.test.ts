import { describe, expect, it } from 'vitest'
import { parseSpxLog } from './spx-log'

describe('SPX log', () => {
  const time = '2025-12-04T14:17:36.24+08:00'

  it('returns null for unrelated or unhandled console messages', () => {
    expect(parseSpxLog('hello')).toBeNull()
    expect(parseSpxLog(JSON.stringify({ msg: 'hello' }))).toBeNull()
    expect(parseSpxLog(JSON.stringify({ level: 'WARN', time, msg: 'warning' }))).toBeNull()
  })

  it('converts execution markers to source locations', () => {
    const log = JSON.stringify({ level: 'INFO', time, msg: '__spx_loc__', file: 'Sprite.spx', line: 3 })
    expect(parseSpxLog(log)).toEqual({
      type: 'executionLocation',
      executionLocation: { file: 'Sprite.spx', line: 3 }
    })
  })

  it('preserves info and panic log fields', () => {
    const infoLog = JSON.stringify({ level: 'INFO', time, msg: 'hello', function: 'main', file: 'Sprite.spx', line: 4 })
    const panicLog = JSON.stringify({
      level: 'ERROR',
      time,
      msg: 'panic',
      error: 'failure',
      file: 'Sprite.spx',
      line: 5,
      column: 7
    })
    expect(parseSpxLog(infoLog)).toEqual({
      type: 'log',
      log: {
        level: 'INFO',
        time,
        msg: 'hello',
        function: 'main',
        file: 'Sprite.spx',
        line: 4
      }
    })
    expect(parseSpxLog(panicLog)).toEqual({
      type: 'log',
      log: {
        level: 'ERROR',
        time,
        msg: 'panic',
        error: 'failure',
        file: 'Sprite.spx',
        line: 5,
        column: 7
      }
    })
  })
})
