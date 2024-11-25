import { describe, it, expect } from 'vitest'
import { stringifyDefinitionId, parseDefinitionId } from './common'

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
  it('should parse definition identifier', () => {
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

  it('should stringify & parse well', () => {
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
