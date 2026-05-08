import { describe, it, expect } from 'vitest'
import { stringifyDefinitionId, parseDefinitionId } from './common'

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
