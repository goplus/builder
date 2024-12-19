import { describe, it, expect } from 'vitest'
import { stringifyDefinitionId, parseDefinitionId, parseResourceURI } from './common'

describe('stringifyDefinitionId', () => {
  it('should stringify definition identifier', () => {
    expect(stringifyDefinitionId({ package: 'fmt', name: 'Println' })).toBe('gop:fmt?Println')
    expect(stringifyDefinitionId({ package: 'github.com/goplus/spx', name: 'Sprite.Clone', overloadId: '1' })).toBe(
      'gop:github.com/goplus/spx?Sprite.Clone#1'
    )
    expect(stringifyDefinitionId({ name: 'for_statement_with_single_condition' })).toBe(
      'gop:?for_statement_with_single_condition'
    )
    expect(stringifyDefinitionId({ package: 'main', name: 'foo' })).toBe('gop:main?foo')
  })
})

describe('parseDefinitionId', () => {
  it('should parse definition identifier correctly', () => {
    expect(parseDefinitionId('gop:fmt?Println')).toEqual({ package: 'fmt', name: 'Println' })
    expect(parseDefinitionId('gop:github.com/goplus/spx?Sprite.Clone#1')).toEqual({
      package: 'github.com/goplus/spx',
      name: 'Sprite.Clone',
      overloadId: '1'
    })
    expect(parseDefinitionId('gop:?for_statement_with_single_condition')).toEqual({
      name: 'for_statement_with_single_condition'
    })
    expect(parseDefinitionId('gop:main?foo')).toEqual({ package: 'main', name: 'foo' })
  })

  it('should stringify & parse correctly', () => {
    ;[
      { package: 'fmt', name: 'Println' },
      { package: 'github.com/goplus/spx', name: 'Sprite.Clone', overloadId: '1' },
      { name: 'for_statement_with_single_condition' },
      { package: 'main', name: 'foo' }
    ].forEach((defId) => {
      expect(parseDefinitionId(stringifyDefinitionId(defId))).toEqual(defId)
    })
  })
})

describe('parseResourceURI', () => {
  it('should parse resource uri correctly', () => {
    expect(parseResourceURI('spx://resources/sprites/Foo')).toEqual([{ type: 'sprite', name: 'Foo' }])
    expect(parseResourceURI('spx://resources/sprites/Foo/animations/Bar')).toEqual([
      { type: 'sprite', name: 'Foo' },
      { type: 'animation', name: 'Bar' }
    ])
    expect(parseResourceURI('spx://resources/sprites/Foo/costumes/bar_baz')).toEqual([
      { type: 'sprite', name: 'Foo' },
      { type: 'costume', name: 'bar_baz' }
    ])
    expect(parseResourceURI('spx://resources/sounds/Bar')).toEqual([{ type: 'sound', name: 'Bar' }])
    expect(parseResourceURI('spx://resources/backdrops/space')).toEqual([{ type: 'backdrop', name: 'space' }])
    expect(parseResourceURI('spx://resources/widgets/%E5%88%86%E6%95%B0')).toEqual([{ type: 'widget', name: '分数' }])
  })
})
