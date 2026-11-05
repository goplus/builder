import type { IDocumentBase } from './document-base'
import { DefinitionKind, type Property } from './common'

/** Keep named functions outside the implicit main function, after any imports. */
export function getTopLevelDeclarationOffset(code: string): number {
  const trivia = String.raw`(?:\s|//[^\r\n]*|/\*[\s\S]*?\*/)*`
  const identifier = String.raw`[_\p{L}][_\p{L}\p{N}]*`
  const stringLiteral = String.raw`(?:"(?:\\[\s\S]|[^"\\])*"|\x60[^\x60]*\x60)`
  const importSpec = `(?:(?:${identifier}|\\.)${trivia})?${stringLiteral}`
  const importGroup = `\\(${trivia}(?:${importSpec}${trivia};?${trivia})*\\)`
  const keywordEnd = String.raw`(?![_\p{L}\p{N}])`
  const importDecl = `import${keywordEnd}${trivia}(?:${importSpec}|${importGroup})${trivia};?${trivia}`
  const packageDecl = `package${keywordEnd}${trivia}${identifier}${trivia};?${trivia}`
  const header = new RegExp(`^${trivia}(?:${packageDecl})?(?:${importDecl})*`, 'u')
  return code.match(header)![0].length
}

/**
 * Filters properties that should be visible in editor-provided property lists.
 */
export async function filterPropertiesByDocumentation(
  properties: Property[],
  documentBase: IDocumentBase,
  classFrameworkPkg: string
): Promise<Property[]> {
  const maybeProperties = await Promise.all(
    properties.map(async (item) => {
      const documentation = await documentBase.getDocumentation(item.definition)
      // Skip APIs from framework packages without documentation — assumed not recommended
      if (item.definition.package === classFrameworkPkg && documentation == null) return null
      if (documentation != null) {
        if (documentation.hiddenFromList) return null
        if (![DefinitionKind.Read, DefinitionKind.Variable, DefinitionKind.Constant].includes(documentation.kind))
          return null
      }
      return item
    })
  )
  return maybeProperties.filter((item) => item != null)
}
