import { describe, expect, it } from 'vitest'
import { isIndependentCommand } from './statement'

describe('Independent command boundaries', () => {
  it.each(['step 10', '\tstep', 'turn -90', 'sprite.step distance', ''])(
    'accepts the simple line %j inside a block',
    (line) => {
      expect(isIndependentCommand(`onStart {\n${line}\n}`, 2)).toBe(true)
    }
  )

  it.each([
    'step 10, 20',
    'step(10)',
    'step []',
    'step 10; turn 90',
    'say "hello"',
    'if',
    'return value',
    'onStart',
    'var distance',
    'step 10 // comment'
  ])('does not infer a boundary for %j', (line) => {
    expect(isIndependentCommand(`onStart {\n${line}\n}`, 2)).toBe(false)
  })

  it.each([
    'step(\nstep',
    'values := [\nstep',
    '/* comment\nstep',
    'say `raw string\nstep',
    'say "unfinished\nstep',
    'value +\nstep',
    'value,\nstep',
    'value =\nstep',
    'value.\nstep',
    'value + // continuation\nstep'
  ])('rejects commands in an unfinished context %j', (source) => {
    expect(isIndependentCommand(source, 2)).toBe(false)
  })

  it.each([
    'say "(ignored)"\nstep',
    'say "escaped \\" quote"\nstep',
    '/* ignored ( [ */\nstep',
    '// ignored ( [\nstep',
    'call(10)\nstep',
    'values := [1, 2]\nstep',
    'say `raw\nstring`\nstep'
  ])('accepts a command after a closed context %j', (source) => {
    expect(isIndependentCommand(source, source.split('\n').length)).toBe(true)
  })

  it('rejects missing lines and mismatched closing delimiters', () => {
    expect(isIndependentCommand('step 10', 2)).toBe(false)
    expect(isIndependentCommand(')\nstep', 2)).toBe(false)
    expect(isIndependentCommand(']\nstep', 2)).toBe(false)
  })
})
