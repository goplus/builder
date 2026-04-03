import type { IDocumentBase } from './document-base'
import { DefinitionKind, type Property } from './common'

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
