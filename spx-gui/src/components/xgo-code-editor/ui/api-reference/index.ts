import { watch } from 'vue'
import { Disposable } from '@/utils/disposable'
import { TaskManager } from '@/utils/task'
import type {
  APICategoryViewInfo,
  APIReferenceContext,
  APIReferenceItem,
  IAPIReferenceProvider
} from '../../api-reference'
import type { CodeEditorUIController } from '../code-editor-ui'

export type { APIReferenceItem, APIReferenceContext, IAPIReferenceProvider, APICategoryViewInfo }

export class APIReferenceController extends Disposable {
  constructor(private ui: CodeEditorUIController) {
    super()
  }

  private itemsMgr = new TaskManager(async (signal) => {
    const provider = this.ui.codeEditor.apiReferenceProvider
    const { activeTextDocument: textDocument } = this.ui
    if (textDocument == null) return null
    return provider.provideAPIReference({ textDocument, signal })
  }, true)

  get items() {
    return this.itemsMgr.result.data
  }

  /**
   * Items after applying `codeEditor.apiReferenceFilter`. This is a synchronous derivation
   * over the already-loaded `items`, so filter changes update the UI reactively without
   * re-running the async provider. Falls back to the full list when the filter matches
   * nothing, to avoid leaving the panel empty.
   */
  get filteredItems() {
    const items = this.items
    if (items == null) return null
    const filter = this.ui.codeEditor.apiReferenceFilter
    if (filter == null) return items
    const filtered = items.filter(filter)
    return filtered.length > 0 ? filtered : items
  }

  get error() {
    return this.itemsMgr.result.error
  }

  get categoryViewInfos(): APICategoryViewInfo[] | null {
    return this.ui.codeEditor.apiReferenceProvider.provideCategoryViewInfos()
  }

  init() {
    this.addDisposer(
      watch(
        () => [this.ui.activeTextDocument, this.ui.codeEditor.apiReferenceProvider],
        ([td]) => {
          if (td == null) return
          this.itemsMgr.start()
        },
        { immediate: true }
      )
    )
  }
}
