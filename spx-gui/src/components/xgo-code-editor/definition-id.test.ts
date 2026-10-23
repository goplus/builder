import { describe, it, expect } from 'vitest'
import { stringifyDefinitionId, parseDefinitionId, resolveDefinitionId } from './definition-id'

describe('stringifyDefinitionId', () => {
  it('should stringify definition identifier', () => {
    expect(stringifyDefinitionId({ package: 'fmt', name: 'Println' })).toBe('xgo:fmt?Println')
    expect(stringifyDefinitionId({ package: 'github.com/goplus/spx/v3', name: 'Sprite.Clone', overloadId: '1' })).toBe(
      'xgo:github.com/goplus/spx/v3?Sprite.Clone#1'
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
    expect(parseDefinitionId('xgo:github.com/goplus/spx/v3?Sprite.Clone#1')).toEqual({
      package: 'github.com/goplus/spx/v3',
      name: 'Sprite.Clone',
      overloadId: '1'
    })
    expect(parseDefinitionId('xgo:?for_statement_with_single_condition')).toEqual({
      name: 'for_statement_with_single_condition'
    })
    expect(parseDefinitionId('xgo:main?foo')).toEqual({ package: 'main', name: 'foo' })
    expect(parseDefinitionId('xgo:preset/spx?Sprite%2EstepTo#%30')).toEqual({
      package: 'preset/spx',
      name: 'Sprite.stepTo',
      overloadId: '0'
    })
  })

  it('should stringify & parse correctly', () => {
    ;[
      { package: 'fmt', name: 'Println' },
      { package: 'github.com/goplus/spx/v3', name: 'Sprite.Clone', overloadId: '1' },
      { name: 'for_statement_with_single_condition' },
      { package: 'main', name: 'foo' }
    ].forEach((defId) => {
      expect(parseDefinitionId(stringifyDefinitionId(defId))).toEqual(defId)
    })
  })
  it.each([
    'stepTo',
    'xgo:',
    'xgo:preset/spx?Sprite.stepTo#0#1',
    'xgo:preset/spx?Sprite.stepTo?',
    'xgo:preset/spx?bad name',
    'xgo:preset/spx?%'
  ])('rejects malformed input: %s', (id) => expect(() => parseDefinitionId(id)).toThrow())
})

describe('resolveDefinitionId', () => {
  it.each(['github.com/goplus/spx/v3', 'example.com/spx/v99'])('uses the active package %s', (packagePath) => {
    const presets = { spx: packagePath }
    expect(resolveDefinitionId({ package: 'preset/spx', name: 'Sprite.stepTo' }, presets)).toEqual({
      package: packagePath,
      name: 'Sprite.stepTo'
    })
    expect(resolveDefinitionId({ package: 'preset/spx', name: 'Sprite.stepTo', overloadId: '0' }, presets)).toEqual({
      package: packagePath,
      name: 'Sprite.stepTo',
      overloadId: '0'
    })
  })

  it.each([
    { package: 'github.com/goplus/spx/v3', name: 'Sprite.stepTo' },
    { package: 'fmt', name: 'println' },
    { package: 'main', name: 'score' },
    { package: 'spx', name: 'Sprite.stepTo' },
    { name: 'if_statement' }
  ])('keeps literal references: $name', (definition) => {
    expect(resolveDefinitionId(definition, { spx: 'example.com/spx/v99' })).toBe(definition)
  })
})

describe('preset package namespace', () => {
  it('resolves arbitrary framework presets, preserving package/member/overload references', () => {
    const presets = { scene: 'example.com/scene/v2', fmt: 'example.com/custom-format' }
    expect(resolveDefinitionId({ package: 'preset/scene' }, presets)).toEqual({ package: 'example.com/scene/v2' })
    expect(resolveDefinitionId({ package: 'preset/scene', name: 'Actor.move', overloadId: '2' }, presets)).toEqual({
      package: 'example.com/scene/v2',
      name: 'Actor.move',
      overloadId: '2'
    })
    expect(resolveDefinitionId({ package: 'fmt', name: 'Println' }, presets)).toEqual({
      package: 'fmt',
      name: 'Println'
    })
    expect(resolveDefinitionId({ package: 'preset/fmt', name: 'Println' }, presets)).toEqual({
      package: 'example.com/custom-format',
      name: 'Println'
    })
  })

  it.each(['preset/spx', 'preset/unknown', 'preset/', 'preset/constructor'])(
    'returns null for unknown preset %s',
    (packageName) => {
      expect(resolveDefinitionId({ package: packageName, name: 'foo' }, {})).toBeNull()
    }
  )

  it('parses a preset reference without resolving it', () => {
    const id = 'xgo:preset/spx?Sprite.stepTo#0'
    expect(stringifyDefinitionId(parseDefinitionId(id))).toBe(id)
  })
})
