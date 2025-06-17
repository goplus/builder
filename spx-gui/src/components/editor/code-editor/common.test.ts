import { describe, it, expect } from 'vitest'
import { stringifyDefinitionId, parseDefinitionId, parseResourceURI, parseResourceContextURI } from './common'

describe('stringifyDefinitionId', () => {
  it('should stringify definition identifier', () => {
    expect(stringifyDefinitionId({ package: 'fmt', name: 'Println' })).toBe('xgo:fmt?Println')
    expect(stringifyDefinitionId({ package: 'github.com/goplus/spx/v2', name: 'Sprite.Clone', overloadId: '1' })).toBe(
      'xgo:github.com/goplus/spx/v2?Sprite.Clone#1'
    )
    expect(stringifyDefinitionId({ name: 'for_statement_with_single_condition' })).toBe(
      'xgo:?for_statement_with_single_condition'
    )
    expect(stringifyDefinitionId({ package: 'main', name: 'foo' })).toBe('xgo:main?foo')
  })
})

describe('parseDefinitionId', () => {
  it('should parse definition identifier correctly', () => {
    expect(parseDefinitionId('xgo:fmt?Println')).toEqual({ package: 'fmt', name: 'Println' })
    expect(parseDefinitionId('xgo:github.com/goplus/spx/v2?Sprite.Clone#1')).toEqual({
      package: 'github.com/goplus/spx/v2',
      name: 'Sprite.Clone',
      overloadId: '1'
    })
    expect(parseDefinitionId('xgo:?for_statement_with_single_condition')).toEqual({
      name: 'for_statement_with_single_condition'
    })
    expect(parseDefinitionId('xgo:main?foo')).toEqual({ package: 'main', name: 'foo' })
  })

  it('should stringify & parse correctly', () => {
    ;[
      { package: 'fmt', name: 'Println' },
      { package: 'github.com/goplus/spx/v2', name: 'Sprite.Clone', overloadId: '1' },
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

describe('parseResourceContextURI', () => {
  it('should parse resource context uri correctly', () => {
    expect(parseResourceContextURI('spx://resources/sprites')).toEqual({ parent: [], type: 'sprite' })
    expect(parseResourceContextURI('spx://resources/sounds')).toEqual({ parent: [], type: 'sound' })
    expect(parseResourceContextURI('spx://resources/sprites/Foo/costumes')).toEqual({
      parent: [{ type: 'sprite', name: 'Foo' }],
      type: 'costume'
    })
    expect(parseResourceContextURI('spx://resources/sprites/Foo/animations')).toEqual({
      parent: [{ type: 'sprite', name: 'Foo' }],
      type: 'animation'
    })
    expect(parseResourceContextURI('spx://resources/sprites/Foo/animations/bar/costumes')).toEqual({
      parent: [
        { type: 'sprite', name: 'Foo' },
        { type: 'animation', name: 'bar' }
      ],
      type: 'costume'
    })
  })
})
