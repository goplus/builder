import { describe, expect, it } from 'vitest'
import { getSimpleExecutionLine } from './simple-execution-line'

describe('Simple Mode execution line', () => {
  it('shows only the selected sprite location', () => {
    const location = {
      textDocument: { uri: 'file:///Sprite.spx' },
      range: { start: { line: 4, column: 1 }, end: { line: 4, column: 1 } }
    }
    expect(getSimpleExecutionLine(location, 'Sprite.spx')).toBe(4)
    expect(getSimpleExecutionLine(location, 'Other.spx')).toBeNull()
    expect(getSimpleExecutionLine(null, 'Sprite.spx')).toBeNull()
  })
})
