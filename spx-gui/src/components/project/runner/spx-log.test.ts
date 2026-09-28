import { describe, expect, it } from 'vitest'
import { isSpxInfoLog, isSpxLocationLog, spxLocationLogMessage } from './spx-log'

describe('SPX execution location log', () => {
  it('routes location messages separately from regular info logs', () => {
    const log = {
      level: 'INFO' as const,
      time: '2025-12-04T14:17:36.24+08:00',
      msg: spxLocationLogMessage,
      file: 'Sprite.spx',
      line: 3
    }
    expect(isSpxLocationLog(log)).toBe(true)
    expect(isSpxInfoLog(log)).toBe(false)
  })
})
