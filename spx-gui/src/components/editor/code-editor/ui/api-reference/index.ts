import { shallowRef, watch } from 'vue'
import { Disposable } from '@/utils/disposable'
import { TaskManager } from '@/utils/task'
import { type BaseContext, type DefinitionDocumentationItem } from '../../common'
import type { CodeEditorUI } from '../code-editor-ui'

export type APIReferenceItem = DefinitionDocumentationItem

export type APIReferenceContext = BaseContext

export interface IAPIReferenceProvider {
  provideAPIReference(ctx: APIReferenceContext): Promise<APIReferenceItem[]>
}

export class APIReferenceController extends Disposable {
  private providerRef = shallowRef<IAPIReferenceProvider | null>(null)
  registerProvider(provider: IAPIReferenceProvider) {
    this.providerRef.value = provider
  }

  constructor(private ui: CodeEditorUI) {
    super()
  }

  private itemsMgr = new TaskManager(async (signal) => {
    const provider = this.providerRef.value
    if (provider == null) return null
    const { activeTextDocument: textDocument } = this.ui
    if (textDocument == null) return null
    return provider.provideAPIReference({ textDocument, signal })
  }, true)

  get items() {
    return this.itemsMgr.result.data
  }

  get error() {
    return this.itemsMgr.result.error
  }

  init() {
    this.addDisposer(
      watch(
        () => [this.ui.activeTextDocument, this.providerRef.value],
        ([td, provider]) => {
          if (td == null || provider == null) return
          this.itemsMgr.start()
        },
        { immediate: true }
      )
    )
  }
}
