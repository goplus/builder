import { describe, expect, it } from 'vitest'
import { isSpxLocationLog } from './spx-location'

describe('SPX execution location', () => {
  it('accepts source lines and rejects generated or malformed locations', () => {
    const location = { level: 'INFO', msg: '__spx_loc__', file: 'Sprite.spx', line: 3 }
    expect(isSpxLocationLog(location)).toBe(true)
    expect(isSpxLocationLog({ ...location, file: 'generated.go' })).toBe(false)
    expect(isSpxLocationLog({ ...location, file: '../Sprite.spx' })).toBe(false)
    expect(isSpxLocationLog({ ...location, line: 0 })).toBe(false)
    expect(isSpxLocationLog({ ...location, line: 1.5 })).toBe(false)
  })
})
