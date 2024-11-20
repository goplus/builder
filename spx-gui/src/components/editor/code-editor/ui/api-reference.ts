import { shallowReactive } from 'vue'
import { Disposable } from '@/utils/disposable'
import { type BaseContext, type Position, type DefinitionDocumentationItem } from '../common'
import type { CodeEditorUI } from '.'

export type APIReferenceItem = DefinitionDocumentationItem

export type APIReferenceContext = BaseContext

export interface IAPIReferenceProvider {
  provideAPIReference(ctx: APIReferenceContext, position: Position): Promise<APIReferenceItem[]>
}

export class APIReference extends Disposable {
  items: APIReferenceItem[] = shallowReactive([])

  private provider: IAPIReferenceProvider | null = null
  registerProvider(provider: IAPIReferenceProvider) {
    this.provider = provider
  }

  constructor(private ui: CodeEditorUI) {
    super()
  }

  async init(signal: AbortSignal) {
    const context: APIReferenceContext = {
      textDocument: this.ui.activeTextDocument!,
      signal
    }
    const items = await this.provider!.provideAPIReference(context, { line: 0, column: 0 })
    this.items.splice(0, this.items.length, ...items)
  }
}
