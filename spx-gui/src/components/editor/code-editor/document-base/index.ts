import { Disposable } from '@/utils/disposable'
import {
  type DefinitionIdentifier,
  type DefinitionDocumentationItem,
  stringifyDefinitionId,
  type DefinitionIdString
} from '../common'
import * as gopDefinitionsByName from './gop'
import * as spxDefinitionsByName from './spx'
import { keys as spxKeyDefinitions } from './spx/key'
import './helpers'

const gopDefinitions = Object.values(gopDefinitionsByName)
const spxDefinitions = Object.values(spxDefinitionsByName)

export class DocumentBase extends Disposable {
  private storage = new Map<string, DefinitionDocumentationItem>()

  constructor() {
    super()
    ;[...gopDefinitions, ...spxDefinitions, ...spxKeyDefinitions].forEach((d) => {
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
