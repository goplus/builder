import { ref, watch } from 'vue'
import { Disposable, getCleanupSignal } from '@/utils/disposable'
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

  private loadingRef = ref(false)
  get loading() {
    return this.loadingRef.value
  }

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
        async ([td], _, onCleanup) => {
          if (td == null) return
          const signal = getCleanupSignal(onCleanup)
          this.loadingRef.value = true
          await this.itemsMgr.start()
          if (!signal.aborted) this.loadingRef.value = false
        },
        { immediate: true }
      )
    )
  }
}
