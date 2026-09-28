import { describe, expect, it } from 'vitest'
import { parseSpxConsoleLog } from './spx-log'

describe('SPX console log', () => {
  const time = '2025-12-04T14:17:36.24+08:00'

  it('ignores unrelated console messages', () => {
    expect(parseSpxConsoleLog('hello')).toBeNull()
    expect(parseSpxConsoleLog(JSON.stringify({ msg: 'hello' }))).toBeNull()
  })

  it('converts execution markers to source locations', () => {
    const log = JSON.stringify({ level: 'INFO', time, msg: '__spx_loc__', file: 'Sprite.spx', line: 3 })
    expect(parseSpxConsoleLog(log)).toEqual({
      type: 'location',
      location: { textDocument: { uri: 'file:///Sprite.spx' }, line: 3 }
    })
  })

  it('converts info and panic logs to outputs', () => {
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
    expect(parseSpxConsoleLog(infoLog)).toEqual({
      type: 'output',
      output: {
        kind: 'log',
        time: Date.parse(time),
        message: 'hello',
        source: {
          textDocument: { uri: 'file:///Sprite.spx' },
          range: { start: { line: 4, column: 1 }, end: { line: 4, column: 1 } }
        }
      }
    })
    expect(parseSpxConsoleLog(panicLog)).toEqual({
      type: 'output',
      output: {
        kind: 'error',
        time: Date.parse(time),
        message: 'failure',
        source: {
          textDocument: { uri: 'file:///Sprite.spx' },
          range: { start: { line: 5, column: 7 }, end: { line: 5, column: 7 } }
        }
      }
    })
  })
})
