import { debounce } from 'lodash'
import { watch } from 'vue'
import { Disposable } from '@/utils/disposable'
import { TaskManager } from '@/utils/task'
import { getCodeFilePath } from '../../common'
import type { CodeEditorUIController } from '../code-editor-ui'

export type { IDiagnosticsProvider, DiagnosticsContext } from '../../diagnostics'

export class DiagnosticsController extends Disposable {
  constructor(private ui: CodeEditorUIController) {
    super()
  }

  private diagnosticsMgr = new TaskManager(async (signal) => {
    const provider = this.ui.codeEditor.diagnosticsProvider
    const textDocument = this.ui.activeTextDocument
    if (textDocument == null) return null
    const files = this.ui.project.exportFiles()
    const source = textDocument.getValue()
    const diagnostics = await provider.provideDiagnostics({ textDocument, signal })
    return { textDocument, files, source, diagnostics }
  }, true)

  get diagnostics() {
    return this.diagnosticsMgr.result.data?.diagnostics ?? null
  }

  /** Excludes the previous results retained for decorations while diagnostics refresh. */
  get currentDiagnostics() {
    const result = this.diagnosticsMgr.result.data
    if (result == null || result.textDocument !== this.ui.activeTextDocument) return null
    const { textDocument, files, source, diagnostics } = result
    const { project } = this.ui
    if (files !== project.exportFiles() || source !== textDocument.getValue()) return null
    const owner = project.getCodeOwner(getCodeFilePath(textDocument.id.uri))
    return owner?.getCode() === source ? diagnostics : null
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
