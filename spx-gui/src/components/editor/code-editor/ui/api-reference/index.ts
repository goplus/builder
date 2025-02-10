import { debounce } from 'lodash'
import { shallowRef, watch } from 'vue'
import { Disposable } from '@/utils/disposable'
import { timeout } from '@/utils/utils'
import { TaskManager } from '@/utils/task'
import { type BaseContext, type Position, type DefinitionDocumentationItem } from '../../common'
import type { CodeEditorUI } from '../code-editor-ui'

export type APIReferenceItem = DefinitionDocumentationItem

export type APIReferenceContext = BaseContext

export interface IAPIReferenceProvider {
  provideAPIReference(ctx: APIReferenceContext, position: Position | null): Promise<APIReferenceItem[]>
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
    if (provider == null) throw new Error('No provider registered')
    const { activeTextDocument: textDocument, cursorPosition } = this.ui
    if (textDocument == null) throw new Error('No active text document')
    return provider.provideAPIReference({ textDocument, signal }, cursorPosition)
  })

  get items() {
    return this.itemsMgr.result.data
  }

  get error() {
    return this.itemsMgr.result.error
  }

  init() {
    const updateItemsWithDebounce = debounce(() => this.itemsMgr.start(), 300)

    this.addDisposer(
      watch(
        () => [this.ui.activeTextDocument, this.ui.cursorPosition],
        async () => {
          updateItemsWithDebounce()

          // Do not wait for debouncing to finish if there is no existing items
          await timeout(0) // `timeout(0)` to avoid `this.items` collected as dep of `watchEffect`
          if (this.items == null) updateItemsWithDebounce.flush()
        },
        { immediate: true }
      )
    )
  }
}
