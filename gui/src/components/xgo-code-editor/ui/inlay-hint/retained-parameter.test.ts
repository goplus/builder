import { describe, expect, it } from 'vitest'
import type { Position } from '../../common'
import { InlayHintKind, type InlayHintItem } from '../../inlay-hint'
import {
  callHasMissingArguments,
  createCallParameterBinding,
  filterIncompleteCallParameterHints,
  getRetainedParameters,
  mergeCallParameterHints,
  updateCallParameterBinding
} from './retained-parameter'

function positionAt(source: string, offset: number): Position {
  const lines = source.slice(0, offset).split('\n')
  return { line: lines.length, column: lines[lines.length - 1].length + 1 }
}

function hintAt(source: string, offset: number, label: string): InlayHintItem {
  return { kind: InlayHintKind.Parameter, label, position: positionAt(source, offset), tooltip: null }
}

function edit(source: string, offset: number, length: number, text = '') {
  const start = positionAt(source, offset)
  const end = positionAt(source, offset + length)
  return {
    source: source.slice(0, offset) + text + source.slice(offset + length),
    changes: [
      {
        range: {
          startLineNumber: start.line,
          startColumn: start.column,
          endLineNumber: end.line,
          endColumn: end.column
        },
        rangeOffset: offset,
        rangeLength: length,
        text
      }
    ]
  }
}

function bind(source: string, hints: InlayHintItem[], offset: number, length = 0) {
  const binding = createCallParameterBinding(source, hints, offset, offset + length)
  expect(binding).not.toBeNull()
  return binding!
}

function replaceArgument(source: string, hints: InlayHintItem[], offset: number, length: number, text = '') {
  const binding = bind(source, hints, offset, length)
  const change = edit(source, offset, length, text)
  const updated = updateCallParameterBinding(binding, change.source, change.changes)
  expect(updated).not.toBeNull()
  return { binding: updated!, source: change.source }
}

function labelsByPosition(items: InlayHintItem[]) {
  return Object.fromEntries(items.map(({ label, position }) => [label, position]))
}

describe('call-bound parameter labels', () => {
  it('drops recovered labels for an initially incomplete call without inventing a binding', () => {
    const source = 'step 10\nglide 100, 200, \n'
    const valid = hintAt(source, source.indexOf('10'), 'distance')
    const recovered = [hintAt(source, source.indexOf('100'), 'target'), hintAt(source, source.indexOf('200'), 'secs')]
    expect(filterIncompleteCallParameterHints(source, [valid, ...recovered])).toEqual([valid])
  })

  it('preserves independent nested-call labels while rejecting the enclosing incomplete call', () => {
    const source = 'outer , rand(10, 20)'
    const recoveredOuter = hintAt(source, source.indexOf('rand'), 'first')
    const nested = [hintAt(source, source.indexOf('10'), 'minimum'), hintAt(source, source.indexOf('20'), 'maximum')]
    expect(filterIncompleteCallParameterHints(source, [recoveredOuter, ...nested])).toEqual(nested)
  })

  it('quarantines enclosing recovery labels when a nested call is itself incomplete', () => {
    const source = 'step rand(, 20), 1'
    const recovered = [
      hintAt(source, source.indexOf('rand'), 'wrongDistance'),
      hintAt(source, source.indexOf('20'), 'minimum'),
      hintAt(source, source.lastIndexOf('1'), 'wrongDuration')
    ]
    expect(filterIncompleteCallParameterHints(source, recovered)).toEqual([])
  })

  it('does not suppress a legal parenthesized trailing comma', () => {
    const source = 'four(1, 2, 3, 4,)'
    const hints = ['1', '2', '3', '4'].map((value, slot) => hintAt(source, source.indexOf(value), `p${slot}`))
    expect(filterIncompleteCallParameterHints(source, hints)).toEqual(hints)
  })

  it('keeps the deleted final slot before an existing newline and rejects recovery overload labels', () => {
    const source = 'glide 100, 200, 1\n'
    const hints = [
      hintAt(source, source.indexOf('100'), 'x'),
      hintAt(source, source.indexOf('200'), 'y'),
      hintAt(source, source.lastIndexOf('1'), 'secs')
    ]
    const next = replaceArgument(source, hints, source.lastIndexOf('1'), 1)
    const recovery = [
      hintAt(next.source, next.source.indexOf('100'), 'target'),
      hintAt(next.source, next.source.indexOf('200'), 'secs')
    ]
    expect(labelsByPosition(mergeCallParameterHints(next.binding, recovery))).toEqual({
      x: { line: 1, column: 7 },
      y: { line: 1, column: 12 },
      secs: { line: 1, column: 17 }
    })
    expect(next.source).toBe('glide 100, 200, \n')
  })

  it('retains both slots when the first argument is empty', () => {
    const source = 'step 100, 1'
    const hints = [
      hintAt(source, source.indexOf('100'), 'distance'),
      hintAt(source, source.lastIndexOf('1'), 'duration')
    ]
    const next = replaceArgument(source, hints, source.indexOf('100'), 3)
    expect(callHasMissingArguments(next.binding)).toBe(true)
    expect(labelsByPosition(getRetainedParameters(next.binding))).toEqual({
      distance: positionAt(next.source, next.source.indexOf(',')),
      duration: positionAt(next.source, next.source.lastIndexOf('1'))
    })
    expect(next.source).toBe('step , 1')
  })

  it('preserves all three slots when the middle argument is empty', () => {
    const source = 'glide 100, 200, 1'
    const hints = [
      hintAt(source, source.indexOf('100'), 'x'),
      hintAt(source, source.indexOf('200'), 'y'),
      hintAt(source, source.lastIndexOf('1'), 'duration')
    ]
    const next = replaceArgument(source, hints, source.indexOf('200'), 3)
    expect(labelsByPosition(getRetainedParameters(next.binding))).toEqual({
      x: positionAt(next.source, next.source.indexOf('100')),
      y: positionAt(next.source, next.source.lastIndexOf(',')),
      duration: positionAt(next.source, next.source.lastIndexOf('1'))
    })
  })

  it('maps four multiline arguments independently of provider hint order', () => {
    const source = 'four(\n  1,\n  2,\n  3,\n  4,\n)'
    const hints = [
      hintAt(source, source.indexOf('3'), 'third'),
      hintAt(source, source.indexOf('1'), 'first'),
      hintAt(source, source.indexOf('4'), 'fourth'),
      hintAt(source, source.indexOf('2'), 'second')
    ]
    const next = replaceArgument(source, hints, source.indexOf('2'), 1)
    const retained = getRetainedParameters(next.binding)
    expect(retained).toHaveLength(4)
    expect(labelsByPosition(retained)).toEqual({
      first: positionAt(next.source, next.source.indexOf('1')),
      second: positionAt(next.source, next.source.indexOf('  ,') + 2),
      third: positionAt(next.source, next.source.indexOf('3')),
      fourth: positionAt(next.source, next.source.indexOf('4'))
    })
  })

  it('uses the hinted source slot when earlier arguments have no visible label', () => {
    const source = 'step 100, 1'
    const hints = [hintAt(source, source.lastIndexOf('1'), 'duration')]
    const next = replaceArgument(source, hints, source.indexOf('100'), 3)
    expect(getRetainedParameters(next.binding)).toEqual([
      { ...hints[0], position: positionAt(next.source, next.source.lastIndexOf('1')), retained: true }
    ])
  })

  it('quarantines recovery labels that renumber a surviving argument', () => {
    const source = 'step 100, 1'
    const hints = [
      hintAt(source, source.indexOf('100'), 'distance'),
      hintAt(source, source.lastIndexOf('1'), 'duration')
    ]
    const next = replaceArgument(source, hints, source.indexOf('100'), 3)
    const recovery = [hintAt(next.source, next.source.lastIndexOf('1'), 'distance')]
    const merged = mergeCallParameterHints(next.binding, recovery)
    expect(merged).toHaveLength(2)
    expect(labelsByPosition(merged)).toEqual({
      distance: positionAt(next.source, next.source.indexOf(',')),
      duration: positionAt(next.source, next.source.lastIndexOf('1'))
    })
  })

  it.each(['100', '"hello, world"', 'targetSprite'])('retains the confirmed slot when deleting %s', (argument) => {
    const source = `take ${argument}, 1`
    const hints = [
      hintAt(source, source.indexOf(argument), 'value'),
      hintAt(source, source.lastIndexOf('1'), 'duration')
    ]
    const next = replaceArgument(source, hints, source.indexOf(argument), argument.length)
    expect(callHasMissingArguments(next.binding)).toBe(true)
    expect(
      getRetainedParameters(next.binding)
        .map(({ label }) => label)
        .sort()
    ).toEqual(['duration', 'value'])
    expect(next.source).toBe('take , 1')
  })

  it('keeps mapping through repeated backspaces and multiple empty slots', () => {
    const source = 'glide 100, 200, 1'
    const hints = [
      hintAt(source, source.indexOf('100'), 'x'),
      hintAt(source, source.indexOf('200'), 'y'),
      hintAt(source, source.lastIndexOf('1'), 'duration')
    ]
    const first = replaceArgument(source, hints, source.indexOf('100') + 1, 2)
    const second = edit(first.source, first.source.indexOf('1'), 1)
    const secondBinding = updateCallParameterBinding(first.binding, second.source, second.changes)
    expect(secondBinding).not.toBeNull()
    const third = edit(second.source, second.source.indexOf('200'), 3)
    const thirdBinding = updateCallParameterBinding(secondBinding!, third.source, third.changes)
    expect(thirdBinding).not.toBeNull()
    expect(labelsByPosition(getRetainedParameters(thirdBinding!))).toEqual({
      x: positionAt(third.source, third.source.indexOf(',')),
      y: positionAt(third.source, third.source.lastIndexOf(',')),
      duration: positionAt(third.source, third.source.lastIndexOf('1'))
    })
  })

  it('remaps positions through newlines inside a parenthesized argument', () => {
    const source = 'four(1, 2, 3, 4)'
    const hints = ['1', '2', '3', '4'].map((text, index) => hintAt(source, source.indexOf(text), `p${index + 1}`))
    const next = replaceArgument(source, hints, source.indexOf('2'), 1, '\n  \n')
    expect(callHasMissingArguments(next.binding)).toBe(true)
    expect(labelsByPosition(getRetainedParameters(next.binding))).toMatchObject({
      p3: positionAt(next.source, next.source.indexOf('3')),
      p4: positionAt(next.source, next.source.indexOf('4'))
    })
  })

  it('does not confuse nested-call hints with the outer argument slot', () => {
    const source = 'outer inner(10, 20), 3'
    const hints = [
      hintAt(source, source.indexOf('inner'), 'value'),
      hintAt(source, source.indexOf('10'), 'nestedX'),
      hintAt(source, source.indexOf('20'), 'nestedY'),
      hintAt(source, source.lastIndexOf('3'), 'duration')
    ]
    const next = replaceArgument(source, hints, source.indexOf('inner'), 'inner(10, 20)'.length)
    expect(labelsByPosition(getRetainedParameters(next.binding))).toEqual({
      value: positionAt(next.source, next.source.indexOf(',')),
      duration: positionAt(next.source, next.source.lastIndexOf('3'))
    })
  })

  it('binds the innermost edited call and preserves fresh hints for its parent', () => {
    const source = 'outer inner(10, 20), 3'
    const hints = [
      hintAt(source, source.indexOf('inner'), 'value'),
      hintAt(source, source.indexOf('10'), 'nestedX'),
      hintAt(source, source.indexOf('20'), 'nestedY'),
      hintAt(source, source.lastIndexOf('3'), 'duration')
    ]
    const next = replaceArgument(source, hints, source.indexOf('10'), 2)
    const fresh = [
      hintAt(next.source, next.source.indexOf('inner'), 'value'),
      hintAt(next.source, next.source.lastIndexOf('3'), 'duration'),
      hintAt(next.source, next.source.indexOf('20'), 'nestedX')
    ]
    expect(labelsByPosition(mergeCallParameterHints(next.binding, fresh))).toEqual({
      value: positionAt(next.source, next.source.indexOf('inner')),
      duration: positionAt(next.source, next.source.lastIndexOf('3')),
      nestedX: positionAt(next.source, next.source.indexOf(',')),
      nestedY: positionAt(next.source, next.source.indexOf('20'))
    })
  })

  it('uses UTF-16 source offsets after earlier Unicode text', () => {
    const source = 'say "🦊"\nstep 100, 1'
    const hints = [
      hintAt(source, source.indexOf('100'), 'distance'),
      hintAt(source, source.lastIndexOf('1'), 'duration')
    ]
    const next = replaceArgument(source, hints, source.indexOf('100'), 3)
    expect(labelsByPosition(getRetainedParameters(next.binding))).toEqual({
      distance: positionAt(next.source, next.source.indexOf(',')),
      duration: positionAt(next.source, next.source.lastIndexOf('1'))
    })
  })

  it('does not invent a label for the lexical slot after a legal trailing comma', () => {
    const source = 'four(1, 2,)'
    const hints = [hintAt(source, source.indexOf('1'), 'first'), hintAt(source, source.indexOf('2'), 'second')]
    const next = replaceArgument(source, hints, source.indexOf('1'), 1)
    expect(getRetainedParameters(next.binding)).toHaveLength(2)
    expect(
      getRetainedParameters(next.binding)
        .map(({ label }) => label)
        .sort()
    ).toEqual(['first', 'second'])
  })

  it('uses trustworthy fresh labels after the original empty slot is filled', () => {
    const source = 'step 100, 1'
    const hints = [
      hintAt(source, source.indexOf('100'), 'distance'),
      hintAt(source, source.lastIndexOf('1'), 'duration')
    ]
    const empty = replaceArgument(source, hints, source.indexOf('100'), 3)
    const filled = edit(empty.source, empty.source.indexOf(','), 0, '200')
    const updated = updateCallParameterBinding(empty.binding, filled.source, filled.changes)
    expect(updated).not.toBeNull()
    expect(callHasMissingArguments(updated!)).toBe(false)
    const fresh = [
      hintAt(filled.source, filled.source.indexOf('200'), 'freshDistance'),
      hintAt(filled.source, filled.source.lastIndexOf('1'), 'freshDuration')
    ]
    expect(mergeCallParameterHints(updated!, fresh)).toEqual(fresh)
  })

  it.each([
    ['callee', 'step 100, 1', 0, 4, 'turn'],
    ['inserted comma', 'step 100, 1', 6, 0, ','],
    ['deleted comma', 'step 100, 1', 8, 1, ''],
    ['closing delimiter', 'step(100, 1)', 11, 1, ''],
    ['another statement', 'step 100, 1\nturn 20', 12, 4, 'move']
  ])('drops binding when changing %s', (_, source, offset, length, text) => {
    const hints = [
      hintAt(source, source.indexOf('100'), 'distance'),
      hintAt(source, source.indexOf('1', source.indexOf('100') + 3), 'duration')
    ]
    const binding = bind(source, hints, source.indexOf('100'), 3)
    const change = edit(source, offset, length, text)
    expect(updateCallParameterBinding(binding, change.source, change.changes)).toBeNull()
  })

  it('does not bind a call that already lacked an earlier argument', () => {
    const source = 'step , 1'
    expect(
      createCallParameterBinding(
        source,
        [hintAt(source, source.lastIndexOf('1'), 'distance')],
        source.lastIndexOf('1'),
        source.length
      )
    ).toBeNull()
  })

  it('does not bind without any provider-confirmed labels', () => {
    const source = 'step 100, 1'
    expect(createCallParameterBinding(source, [], source.indexOf('100'), source.indexOf('100') + 3)).toBeNull()
  })
})
