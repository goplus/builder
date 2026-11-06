import { debounce } from 'lodash'
import { watch } from 'vue'
import { Disposable } from '@/utils/disposable'
import { TaskManager } from '@/utils/task'
import type { CodeEditorUIController } from '../code-editor-ui'

export * from '../../inlay-hint'

export class InlayHintController extends Disposable {
  constructor(private ui: CodeEditorUIController) {
    super()
  }

  private mgr = new TaskManager(async (signal) => {
    const provider = this.ui.codeEditor.inlayHintProvider
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
