import { debounce } from 'lodash'
import { shallowRef, watchEffect } from 'vue'
import { Disposable, getCleanupSignal } from '@/utils/disposable'
import { type BaseContext, type Position, type DefinitionDocumentationItem } from '../../common'
import type { CodeEditorUI } from '../code-editor-ui'

export type APIReferenceItem = DefinitionDocumentationItem

export type APIReferenceContext = BaseContext

export interface IAPIReferenceProvider {
  provideAPIReference(ctx: APIReferenceContext, position: Position): Promise<APIReferenceItem[]>
}

export class APIReferenceController extends Disposable {
  private itemsRef = shallowRef<APIReferenceItem[] | null>(null)
  get items() {
    return this.itemsRef.value
  }

  private providerRef = shallowRef<IAPIReferenceProvider | null>(null)
  registerProvider(provider: IAPIReferenceProvider) {
    this.providerRef.value = provider
  }

  constructor(private ui: CodeEditorUI) {
    super()
  }

  init() {
    const updateItems = debounce(
      async (provider: IAPIReferenceProvider, context: APIReferenceContext, position: Position | null) => {
        context.signal.throwIfAborted() // in case request cancelled when debouncing
        this.itemsRef.value = await provider.provideAPIReference(context, position ?? { line: 1, column: 1 })
      },
      300
    )

    this.addDisposer(
      watchEffect(async (onCleanup) => {
        const signal = getCleanupSignal(onCleanup)
        const provider = this.providerRef.value
        if (provider == null) return
        const { activeTextDocument, cursorPosition } = this.ui
        if (activeTextDocument == null) return
        const context: APIReferenceContext = { textDocument: activeTextDocument, signal }
        updateItems(provider, context, cursorPosition)
      })
    )
  }
}
