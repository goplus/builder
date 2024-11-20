import type { DefinitionIdentifier } from './common'
import type { APIReferenceItem } from './ui'

export class DocumentBase {
  async getDocumentaion(definition: DefinitionIdentifier): Promise<APIReferenceItem | null> {
    console.warn('TODO', definition)
    return null
  }
}
