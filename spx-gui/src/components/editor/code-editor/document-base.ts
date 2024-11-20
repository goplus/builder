import type { DefinitionIdentifier, DocumentationItem } from './common'

export class DocumentBase {
  async getDocumentation(definition: DefinitionIdentifier): Promise<DocumentationItem | null> {
    console.warn('TODO', definition)
    return null
  }
}
