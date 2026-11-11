import { describe, expect, it } from 'vitest'
import { InlayHintKind, type InlayHintItem } from '../../inlay-hint'
import { retainDeletedParameter } from './retained-parameter'

const source = 'onStart {\n\tstep 100\n}\n'
const hint: InlayHintItem = {
  label: 'distance',
  kind: InlayHintKind.Parameter,
  position: { line: 2, column: 7 },
  tooltip: null
}

function deletion(startColumn = 7, endColumn = 10, text = '') {
  return [
    {
      range: { startLineNumber: 2, startColumn, endLineNumber: 2, endColumn },
      rangeLength: endColumn - startColumn,
      rangeOffset: 16,
      text
    }
  ]
}

describe('retained numeric parameter labels', () => {
  it('preserves a resolved label after deleting its numeric argument, without changing code or metadata', () => {
    const empty = 'onStart {\n\tstep \n}\n'
    const result = retainDeletedParameter(source, source, empty, [hint], deletion(), { line: 2, column: 7 })
    expect(result).toEqual({ ...hint, retained: true })
    expect(hint).not.toHaveProperty('retained')
    expect(empty).toBe('onStart {\n\tstep \n}\n')
  })

  it('keeps the same label through repeated backspaces before the provider catches up', () => {
    const partial = 'onStart {\n\tstep 1\n}\n'
    expect(
      retainDeletedParameter(source, source, partial, [hint], deletion(8, 10), { line: 2, column: 8 })
    ).not.toBeNull()
    expect(
      retainDeletedParameter(source, partial, 'onStart {\n\tstep \n}\n', [hint], deletion(7, 8), { line: 2, column: 7 })
    ).toEqual({ ...hint, retained: true })
  })

  it.each([
    ['callee change', 'onStart {\n\tturn \n}\n', [hint], deletion()],
    ['pasted replacement', 'onStart {\n\tstep 2\n}\n', [hint], deletion(7, 10, '2')],
    ['newline insertion', 'onStart {\n\tstep \n\n}\n', [hint], deletion(7, 10, '\n')],
    ['other statement change', 'onStart {\n\tstep \n}\nturn 10', [hint], deletion()],
    [
      'competing parameter',
      'onStart {\n\tstep \n}\n',
      [hint, { ...hint, label: 'another', position: { line: 2, column: 8 } }],
      deletion()
    ],
    ['deleted callee spacing', 'onStart {\n\tstep\n}\n', [hint], deletion(6, 10)]
  ])('does not infer a label for %s', (_, next, hints, changes) => {
    expect(
      retainDeletedParameter(
        source,
        source,
        next as string,
        hints as InlayHintItem[],
        changes as ReturnType<typeof deletion>,
        { line: 2, column: 7 }
      )
    ).toBeNull()
  })

  it.each([
    ['\tstep "100"', 7],
    ['\tstep 10, 20', 7],
    ['\tstep(100)', 7],
    ['\tstep 100 // distance', 7],
    ['\tvalue := step 100', 16]
  ])('does not guess ambiguous or unsupported syntax: %s', (line, column) => {
    const previous = `onStart {\n${line}\n}\n`
    expect(
      retainDeletedParameter(
        previous,
        previous,
        'onStart {\n\tstep \n}\n',
        [{ ...hint, position: { line: 2, column } }],
        deletion(),
        { line: 2, column: 7 }
      )
    ).toBeNull()
  })

  it('requires the cursor to stay in the same argument', () => {
    const next = 'onStart {\n\tstep \n}\n'
    for (const cursor of [null, { line: 3, column: 1 }, { line: 2, column: 3 }])
      expect(retainDeletedParameter(source, source, next, [hint], deletion(), cursor)).toBeNull()
  })
})
