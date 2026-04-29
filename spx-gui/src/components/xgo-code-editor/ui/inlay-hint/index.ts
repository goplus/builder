import { debounce } from 'lodash'
import { shallowRef, watch } from 'vue'
import { Disposable } from '@/utils/disposable'
import { TaskManager } from '@/utils/task'
import type { IInlayHintProvider } from '../../inlay-hint'
import type { CodeEditorUIController } from '../code-editor-ui'

export * from '../../inlay-hint'

export class InlayHintController extends Disposable {
  private providerRef = shallowRef<IInlayHintProvider | null>(null)
  registerProvider(provider: IInlayHintProvider) {
    this.providerRef.value = provider
  }

  constructor(private ui: CodeEditorUIController) {
    super()
  }

  private mgr = new TaskManager(async (signal) => {
    const provider = this.providerRef.value
    if (provider == null) return []
    const { activeTextDocument: textDocument } = this.ui
    if (textDocument == null) return []
    return await provider.provideInlayHints({ textDocument, signal })
  }, true)

  get items() {
    return this.mgr.result.data
  }

  init() {
    const refresh = debounce(() => this.mgr.start(), 100)

    this.addDisposer(
      watch(
        () => [this.ui.project.exportFiles(), this.ui.activeTextDocument],
        () => refresh(),
        { immediate: true }
      )
    )
  }
}
