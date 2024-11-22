import { type DefinitionIdentifier, type DefinitionDocumentationItem, stringifyDefinitionId } from '../common'
import * as gopDefinitions from './gop'
import * as spxDefinitions from './spx'

export class DocumentBase {
  private storage = new Map<string, DefinitionDocumentationItem>()

  constructor() {
    ;[...Object.values(gopDefinitions), ...Object.values(spxDefinitions)].forEach((d) => {
      this.addDocumentation(d)
    })
  }

  private addDocumentation(documentation: DefinitionDocumentationItem) {
    const key = stringifyDefinitionId(documentation.definition)
    this.storage.set(key, documentation)
  }

  async getDocumentation(defId: DefinitionIdentifier): Promise<DefinitionDocumentationItem | null> {
    const key = stringifyDefinitionId(defId)
    return this.storage.get(key) ?? null
  }
}
