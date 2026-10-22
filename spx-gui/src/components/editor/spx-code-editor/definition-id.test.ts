import { describe, expect, it } from 'vitest'
import type { IXGoProject } from '@/components/xgo-code-editor/project'
import { parseDefinitionId } from '@/components/xgo-code-editor/common'
import { spxClassFramework } from './spx-project'
import { resolveDefinitionId } from './definition-id'

function makeProject(pkgPaths: string[]): IXGoProject {
  return {
    classFramework: { ...spxClassFramework, pkgPaths },
    getCodeFiles: () => [],
    getCodeOwner: () => null,
    exportFiles: () => ({})
  }
}

describe('resolveDefinitionId', () => {
  it.each(['github.com/goplus/spx/v3', 'example.com/spx/v99'])('uses the active package %s', (packagePath) => {
    const project = makeProject([packagePath])
    expect(resolveDefinitionId('xgo:spx?Sprite.stepTo', project)).toEqual({
      package: packagePath,
      name: 'Sprite.stepTo'
    })
    expect(resolveDefinitionId('xgo:spx?Sprite%2EstepTo#0', project)).toEqual({
      package: packagePath,
      name: 'Sprite.stepTo',
      overloadId: '0'
    })
  })

  it.each([
    'xgo:github.com/goplus/spx/v3?Sprite.stepTo',
    'xgo:fmt?println',
    'xgo:main?score',
    'xgo:spxx?Sprite.stepTo',
    'xgo:?if_statement'
  ])('keeps literal references: %s', (id) => {
    expect(resolveDefinitionId(id, makeProject(['example.com/spx/v99']))).toEqual(parseDefinitionId(id))
  })

  it.each(['stepTo', 'xgo:', 'xgo:spx?Sprite.stepTo#0#1', 'xgo:spx?Sprite.stepTo?', 'xgo:spx?bad name', 'xgo:spx?%'])(
    'rejects malformed input: %s',
    (id) => expect(() => resolveDefinitionId(id, makeProject(['example.com/spx/v99']))).toThrow()
  )

  it('reports missing SPX configuration without rejecting literal packages', () => {
    const project = makeProject([])
    expect(() => resolveDefinitionId('xgo:spx?Sprite.stepTo', project)).toThrow('SPX package is not configured')
    expect(resolveDefinitionId('xgo:fmt?println', project)).toEqual({ package: 'fmt', name: 'println' })
  })
})
