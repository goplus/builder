import { debounce } from 'lodash'
import { shallowRef, watch } from 'vue'
import { Disposable } from '@/utils/disposable'
import { TaskManager } from '@/utils/task'
import type { IDiagnosticsProvider } from '../../diagnostics'
import type { CodeEditorUIController } from '../code-editor-ui'

export type { IDiagnosticsProvider, DiagnosticsContext } from '../../diagnostics'

export class DiagnosticsController extends Disposable {
  private providerRef = shallowRef<IDiagnosticsProvider | null>(null)

  registerProvider(provider: IDiagnosticsProvider) {
    this.providerRef.value = provider
  }

  constructor(private ui: CodeEditorUIController) {
    super()
  }

  private diagnosticsMgr = new TaskManager(async (signal) => {
    const provider = this.providerRef.value
    if (provider == null) return []
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
        this.providerRef,
        (provider, _, onCleanup) => {
          if (provider == null) return
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
