import { shallowRef, watch } from 'vue'
import { Disposable } from '@/utils/disposable'
import { TaskManager } from '@/utils/task'
import type {
  APICategoryViewInfo,
  APIReferenceContext,
  APIReferenceItem,
  IAPIReferenceProvider
} from '../../api-reference'
import type { CodeEditorUIController } from '../code-editor-ui'
import { leadingIdentifier, normalizeCode } from '../code-guide'

export type { APIReferenceItem, APIReferenceContext, IAPIReferenceProvider, APICategoryViewInfo }

export class APIReferenceController extends Disposable {
  constructor(private ui: CodeEditorUIController) {
    super()
  }

  /** Code whose corresponding API item should be highlighted, or null. */
  private highlightCodeRef = shallowRef<string | null>(null)
  private highlightedItemRef = shallowRef<APIReferenceItem | null>(null)

  /** The API item currently highlighted (e.g. while a drag guide points the user at it), or null. */
  get highlightedItem() {
    return this.highlightedItemRef.value
  }

  /** Highlight the API item whose function name matches the leading identifier of `code`. */
  highlightForCode(code: string) {
    this.highlightCodeRef.value = code
    this.applyHighlight()
  }

  clearHighlight() {
    this.highlightCodeRef.value = null
    this.highlightedItemRef.value = null
  }

  private applyHighlight() {
    const code = this.highlightCodeRef.value
    if (code == null || code === '') {
      this.highlightedItemRef.value = null
      return
    }
    const items = this.items ?? []
    // Prefer the item whose resolved snippet matches the expected code exactly — this disambiguates
    // same-name variants (e.g. several `turn ...` overloads). Fall back to matching by function name.
    const target = normalizeCode(code)
    const name = leadingIdentifier(code)
    this.highlightedItemRef.value =
      items.find((item) => normalizeCode(this.ui.parseSnippet(item.insertSnippet).toString()) === target) ??
      (name !== '' ? items.find((item) => leadingIdentifier(item.insertSnippet) === name) : undefined) ??
      null
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
    // Re-resolve the highlighted item when the item list (re)loads.
    this.addDisposer(
      watch(
        () => this.items,
        () => this.applyHighlight()
      )
    )
  }
}
