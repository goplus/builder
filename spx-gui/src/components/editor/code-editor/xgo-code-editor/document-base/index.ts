import {
  type DefinitionIdentifier,
  type DefinitionDocumentationItem,
  stringifyDefinitionId,
  type DefinitionIdString
} from '../common'
import * as xgoDefinitionsByName from './xgo'

export interface IDocumentBase {
  getDocumentation(defId: DefinitionIdentifier): Promise<DefinitionDocumentationItem | null>
}

const xgoDefinitions = Object.values(xgoDefinitionsByName)

export class DocumentBase implements IDocumentBase {
  private storage = new Map<string, DefinitionDocumentationItem>()

  constructor(definitions: DefinitionDocumentationItem[] = []) {
    ;[...xgoDefinitions, ...definitions].forEach((d) => {
      this.addDocumentation(d)
    })
  }

  private addDocumentation(documentation: DefinitionDocumentationItem) {
    const key = stringifyDefinitionId(documentation.definition)
    this.storage.set(key, documentation)
  }

  async getDocumentation(
    defId: DefinitionIdentifier | DefinitionIdString
  ): Promise<DefinitionDocumentationItem | null> {
    const key = typeof defId === 'string' ? defId : stringifyDefinitionId(defId)
    return this.storage.get(key) ?? null
  }

  async getAllDocumentations(): Promise<DefinitionDocumentationItem[]> {
    return [...this.storage.values()]
  }
}
