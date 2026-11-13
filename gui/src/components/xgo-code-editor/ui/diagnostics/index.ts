import { debounce } from 'lodash'
import { watch } from 'vue'
import { Disposable } from '@/utils/disposable'
import { TaskManager } from '@/utils/task'
import type { CodeEditorUIController } from '../code-editor-ui'

export type { IDiagnosticsProvider, DiagnosticsContext } from '../../diagnostics'

export class DiagnosticsController extends Disposable {
  constructor(private ui: CodeEditorUIController) {
    super()
  }

  private diagnosticsMgr = new TaskManager(async (signal) => {
    const provider = this.ui.codeEditor.diagnosticsProvider
    const textDocument = this.ui.activeTextDocument
    if (textDocument == null) return []
    return provider.provideDiagnostics({ textDocument, signal })
  }, true)

  get diagnostics() {
    return this.diagnosticsMgr.result.data
  }

  init() {
    const refreshDiagnostics = debounce(() => this.diagnosticsMgr.start(), 100)

    this.addDisposer(
      watch(
        () => this.ui.codeEditor.diagnosticsProvider,
        (provider, _, onCleanup) => {
          refreshDiagnostics()
          onCleanup(provider.on('didChangeDiagnostics', refreshDiagnostics))
        },
        { immediate: true }
      )
    )

    this.addDisposer(
      watch(
        () => [this.ui.project.exportFiles(), this.ui.activeTextDocument],
        () => refreshDiagnostics(),
        { immediate: true }
      )
    )
  }
}
