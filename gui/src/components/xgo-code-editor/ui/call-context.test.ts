import { describe, expect, it } from 'vitest'
import { findCallAt, findCalls, findEnclosingBlock } from './call-context'

function contextAtEnd(source: string) {
  return findCallAt(source, source.length)
}

function argumentTexts(source: string) {
  return contextAtEnd(source)?.arguments.map((argument) => source.slice(argument.start, argument.end))
}

describe('Call statements and lexical argument slots', () => {
  it.each([
    ['step 100, 1', ['100', '1']],
    ['step , 1', ['', '1']],
    ['glide 100,,1', ['100', '', '1']],
    ['glide , , ', ['', '', '']],
    ['step 100, ', ['100', '']],
    ['step ', ['']],
    ['step', []],
    ['glide 100, 0, 1, 20', ['100', '0', '1', '20']],
    ['glide 100,\n 0,\n 1,\n 20', ['100', '0', '1', '20']],
    ['step 100,\n 1,\n "walk"', ['100', '1', '"walk"']],
    ['glide 100,\n ,\n 1', ['100', '', '1']],
    ['角色.移动 距离, 速度, "走路"', ['距离', '速度', '"走路"']],
    ['step -100, +1', ['-100', '+1']],
    ['say "hello, world", "a\\"b,c"', ['"hello, world"', '"a\\"b,c"']],
    ['say `hello,\nworld`, 1', ['`hello,\nworld`', '1']],
    ['glide pick(1, 2), [3, 4], "walk"', ['pick(1, 2)', '[3, 4]', '"walk"']],
    ['glide [1, [2, 3]], {x: 1, y: 2}, "walk"', ['[1, [2, 3]]', '{x: 1, y: 2}', '"walk"']],
    ['glide 100, /* a,b */ 1, "walk"', ['100', '1', '"walk"']],
    ['glide 100, // a,b\n 1, "walk"', ['100', '1', '"walk"']]
  ])('identifies slots without inventing parameter names: %s', (source, expected) => {
    expect(argumentTexts(source as string)).toEqual(expected)
  })

  it.each([
    ['step()', []],
    ['step(100, 1)', ['100', '1']],
    ['step(, 1)', ['', '1']],
    ['step(100,)', ['100', '']],
    ['step(100, 1, "walk",)', ['100', '1', '"walk"', '']],
    ['step(\n 100,\n 1,\n "walk",\n)', ['100', '1', '"walk"', '']],
    ['step(\n ,\n 1,\n "walk",\n)', ['', '1', '"walk"', '']],
    ['step(pick(1, 2), [3, 4], "a,b")', ['pick(1, 2)', '[3, 4]', '"a,b"']]
  ])('handles parenthesized calls and explicit empty slots: %s', (source, expected) => {
    const context = contextAtEnd(source as string)
    expect(context?.parenthesized).toBe(true)
    expect(argumentTexts(source as string)).toEqual(expected)
    expect(context?.end).toBe((source as string).length)
  })

  it('preserves UTF-16 offsets and anchors an empty slot after its whitespace', () => {
    const source = '移动 "😀,你",\n  , 速度'
    const context = contextAtEnd(source)!
    expect(context.callee).toBe('移动')
    expect(context.commas).toEqual([source.indexOf(',\n'), source.indexOf(', 速度')])
    expect(context.arguments[1]).toEqual({ start: source.indexOf(', 速度'), end: source.indexOf(', 速度') })
    expect(source.slice(context.arguments[2].start, context.arguments[2].end)).toBe('速度')
  })

  it('ends a bare command at a normal newline instead of joining the next statement', () => {
    const source = 'step 100\n  turn 90'
    expect(findCallAt(source, 8)?.callee).toBe('step')
    expect(contextAtEnd(source)?.callee).toBe('turn')
    expect(findCallAt(source, source.indexOf('turn') - 1)).toBeNull()
  })

  it('excludes trailing comments and protects commas inside comments', () => {
    const source = 'step 100, 1 // comment, text\nturn 90'
    expect(findCallAt(source, source.indexOf('//') + 1)).toBeNull()
    expect(findCallAt(source, source.indexOf('comment'))).toBeNull()
    expect(findCalls(source).map((call) => call.callee)).toEqual(['step', 'turn'])
  })
})

describe('Owning statements and callback blocks', () => {
  it.each(['onStart', 'repeat 3', 'onKey KeySpace, =>', 'if ready', 'for i := 0; i < 3; i++'])(
    'finds the inner command instead of consuming the body: %s',
    (header) => {
      const source = `${header} {\n  glide 100,,1\n  turn 90\n}`
      const offset = source.indexOf(',,') + 1
      const context = findCallAt(source, offset)!
      expect(context.callee).toBe('glide')
      expect(context.arguments.map((argument) => source.slice(argument.start, argument.end))).toEqual(['100', '', '1'])
      expect(context.end).toBeLessThan(source.indexOf('turn'))
      expect(findCallAt(source, source.indexOf('}'))).toBeNull()
    }
  )

  it('selects the owning statement while listing nested expression calls for hints', () => {
    const source = 'glide pick(1, nested(2, 3)), 0, "walk"'
    expect(findCallAt(source, source.indexOf('nested') + 2)?.callee).toBe('glide')
    expect(
      findCalls(source)
        .map((call) => call.callee)
        .sort()
    ).toEqual(['glide', 'nested', 'pick'])
  })

  it('finds the nearest balanced block for nested callbacks', () => {
    const source = 'onStart {\n repeat 3 {\n  glide 100,\n   , 1\n }\n turn 90\n}'
    const block = findEnclosingBlock(source, source.indexOf('glide'))!
    expect(source.slice(block.start, block.end)).toBe('{\n  glide 100,\n   , 1\n }')
    const outer = findEnclosingBlock(source, source.indexOf('turn'))!
    expect(outer.start).toBe(source.indexOf('{'))
  })

  it('does not make a callback body part of its outer call', () => {
    const source = 'visit(1, () => {\n  step 100, 1\n})'
    expect(findCallAt(source, source.indexOf('step'))?.callee).toBe('step')
    expect(findCallAt(source, source.indexOf('visit'))).toBeNull()
  })

  it('finds a command after a switch-case label', () => {
    const source = 'switch value {\ncase 1: step 100, 1\ndefault: turn 90\n}'
    expect(findCallAt(source, source.indexOf('step'))?.callee).toBe('step')
    expect(findCallAt(source, source.indexOf('turn'))?.callee).toBe('turn')
  })

  it('does not pretend a call result receiver is a plain identifier', () => {
    const source = 'factory().use(1)'
    expect(contextAtEnd(source)).toBeNull()
    expect(findCalls(source).map((call) => call.callee)).toEqual(['factory'])
  })

  it('accepts a caret at the statement end before the containing closing brace', () => {
    const source = 'onStart { step , 1 }'
    const call = findCallAt(source, source.indexOf('}'))
    expect(call?.callee).toBe('step')
    expect(call?.end).toBe(source.indexOf('}'))
  })
})

describe('Uncertain syntax fails closed', () => {
  it.each([
    'var value = 1',
    'const value = 1',
    'type Value int',
    'func use(a int)',
    'return step(1)',
    'go step(1)',
    'defer step(1)',
    'if value',
    'for value',
    'x := step(1)',
    'x = step(1)',
    'x == step(1)',
    'x + 1',
    'step(100, 1',
    'step [100, 1',
    'step "unterminated, 1',
    'step /* unterminated',
    'step(100\n1)',
    'step(\n100,\n1\n)',
    'step(1]',
    'step 100;'
  ])('does not identify an owning call for %s', (source) => {
    expect(contextAtEnd(source)).toBeNull()
  })

  it('does not return an unbalanced enclosing block', () => {
    expect(findEnclosingBlock('onStart { step 100', 12)).toBeNull()
  })

  it('bounds processing for excessive nesting and source size', () => {
    expect(findCalls('step(' + '('.repeat(80) + '1' + ')'.repeat(81))).toEqual([])
    expect(findCalls(' '.repeat(200_001))).toEqual([])
  })
})
