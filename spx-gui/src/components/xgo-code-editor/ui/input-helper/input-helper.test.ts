import { describe, expect, it } from 'vitest'
import { BuiltInInputType, InputKind, type InputSlot } from '../../common'
import { isInputHelperHidden } from '.'

// The tutorial's block style hides the helper for plain literals & direction, keeps it for pickers.
const hidden = new Set<string>([
  BuiltInInputType.Integer,
  BuiltInInputType.Decimal,
  BuiltInInputType.String,
  BuiltInInputType.Boolean,
  'spx-direction'
])

function slot(acceptType: string, inputType = acceptType, value: unknown = null): Pick<InputSlot, 'accept' | 'input'> {
  return {
    accept: { type: acceptType },
    input: { kind: InputKind.InPlace, type: inputType, value }
  }
}

describe('isInputHelperHidden', () => {
  it('never hides when the hidden set is empty (normal editor)', () => {
    const none = new Set<string>()
    expect(isInputHelperHidden(none, slot(BuiltInInputType.Integer))).toBe(false)
    expect(isInputHelperHidden(none, slot('spx-color'))).toBe(false)
  })

  it('hides the configured types', () => {
    expect(isInputHelperHidden(hidden, slot(BuiltInInputType.Integer))).toBe(true)
    expect(isInputHelperHidden(hidden, slot(BuiltInInputType.Decimal))).toBe(true)
    expect(isInputHelperHidden(hidden, slot(BuiltInInputType.String))).toBe(true)
    expect(isInputHelperHidden(hidden, slot(BuiltInInputType.Boolean))).toBe(true)
    expect(isInputHelperHidden(hidden, slot('spx-direction'))).toBe(true)
  })

  it('keeps the helper for the picker/resource types', () => {
    for (const type of ['spx-color', 'spx-key', 'spx-effect-kind', 'spx-play-action', 'spx-sprite-instance']) {
      expect(isInputHelperHidden(hidden, slot(type))).toBe(false)
    }
  })

  it('falls back to the value type when the slot accepts `unknown`', () => {
    // accept=unknown, value is really an integer -> gated as integer
    expect(isInputHelperHidden(hidden, slot(BuiltInInputType.Unknown, BuiltInInputType.Integer))).toBe(true)
    // accept=unknown, value is a color -> not gated
    expect(isInputHelperHidden(hidden, slot(BuiltInInputType.Unknown, 'spx-color'))).toBe(false)
  })
})
