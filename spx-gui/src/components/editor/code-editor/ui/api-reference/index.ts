import { shallowRef, watchEffect } from 'vue'
import { Disposable, getCleanupSignal } from '@/utils/disposable'
import { type BaseContext, type Position, type DefinitionDocumentationItem } from '../../common'
import type { CodeEditorUI } from '..'

export type APIReferenceItem = DefinitionDocumentationItem

export type APIReferenceContext = BaseContext

export interface IAPIReferenceProvider {
  provideAPIReference(ctx: APIReferenceContext, position: Position): Promise<APIReferenceItem[]>
}

export class APIReferenceController extends Disposable {
  itemsRef = shallowRef<APIReferenceItem[] | null>(null)

  private providerRef = shallowRef<IAPIReferenceProvider | null>(null)
  registerProvider(provider: IAPIReferenceProvider) {
    this.providerRef.value = provider
  }

  constructor(private ui: CodeEditorUI) {
    super()
  }

  init() {
    this.addDisposer(
      // TODO: listen to cursor position change
      watchEffect(async (onCleanup) => {
        const signal = getCleanupSignal(onCleanup)
        const provider = this.providerRef.value
        if (provider == null) return
        const textDocument = this.ui.activeTextDocument
        if (textDocument == null) return
        const context: APIReferenceContext = { textDocument, signal }
        this.itemsRef.value = await provider.provideAPIReference(context, { line: 0, column: 0 })
      })
    )
  }
}
