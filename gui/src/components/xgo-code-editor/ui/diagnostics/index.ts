import { debounce } from 'lodash'
import { shallowRef, watch } from 'vue'
import { Disposable } from '@/utils/disposable'
import { Cancelled } from '@/utils/exception'
import { TaskManager } from '@/utils/task'
import type { Files } from '@/models/common/file'
import { DiagnosticSeverity, getCodeFilePath } from '../../common'
import type { TextDocument } from '../../text-document'
import type { CodeEditorUIController } from '../code-editor-ui'
import { sameFilesOutsideDocument } from '../editing-context'
import { isIndependentCommand } from './statement'

export type { IDiagnosticsProvider, DiagnosticsContext } from '../../diagnostics'

export class DiagnosticsController extends Disposable {
  constructor(private ui: CodeEditorUIController) {
    super()
  }

  private diagnosticsMgr = new TaskManager(async (signal) => {
    const provider = this.ui.codeEditor.diagnosticsProvider
    const textDocument = this.ui.activeTextDocument
    if (textDocument == null) return null
    const source = textDocument.getValue()
    const version = textDocument.monacoTextModel.getVersionId()
    const files = this.ui.project.exportFiles()
    if (this.ui.simpleMode) {
      const owner = this.ui.project.getCodeOwner(getCodeFilePath(textDocument.id.uri))
      if (owner?.getCode() !== source) throw new Cancelled('Project code is still synchronizing')
    }
    const diagnostics = await provider.provideDiagnostics({ textDocument, signal })
    if (
      this.ui.simpleMode &&
      (this.ui.codeEditor.diagnosticsProvider !== provider ||
        this.ui.activeTextDocument !== textDocument ||
        textDocument.monacoTextModel.getVersionId() !== version ||
        this.ui.project.exportFiles() !== files)
    )
      throw new Cancelled('Stale diagnostics')
    return { diagnostics, textDocument, source, version, files }
  }, true)

  private pending = shallowRef<{
    textDocument: TextDocument
    line: number
    baselineVersion: number
    files: Files
  } | null>(null)
  private refreshDiagnostics = debounce(() => this.diagnosticsMgr.start(), 100)

  get diagnostics() {
    const report = this.diagnosticsMgr.result.data
    if (report == null) return null
    if (this.ui.simpleMode && report.textDocument !== this.ui.activeTextDocument) return null
    const pending = this.pending.value
    if (
      !this.ui.simpleMode ||
      pending == null ||
      report.version <= pending.baselineVersion ||
      !sameFilesOutsideDocument(pending.files, this.ui.project.exportFiles(), pending.textDocument)
    )
      return report.diagnostics
    return report.diagnostics.filter(
      (diagnostic) =>
        !(
          diagnostic.origin === 'static' &&
          diagnostic.severity === DiagnosticSeverity.Error &&
          diagnostic.range.start.line === pending.line &&
          diagnostic.range.end.line === pending.line
        )
    )
  }

  reveal() {
    this.pending.value = null
    this.refreshDiagnostics.cancel()
    void this.diagnosticsMgr.start()
  }

  init() {
    const refreshDiagnostics = this.refreshDiagnostics
    this.addDisposer(() => refreshDiagnostics.cancel())
    this.addDisposer(() => this.diagnosticsMgr.stop())

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
        () => [this.ui.project.exportFiles(), this.ui.activeTextDocument] as const,
        ([files, textDocument]) => {
          const pending = this.pending.value
          if (
            pending != null &&
            (pending.textDocument !== textDocument ||
              !sameFilesOutsideDocument(pending.files, files, pending.textDocument))
          )
            this.pending.value = null
          refreshDiagnostics()
        },
        { immediate: true }
      )
    )

    if (!this.ui.simpleMode) return
    const editor = this.ui.editor
    let previousSource = editor.getValue()
    let previousVersion = editor.getModel()?.getVersionId() ?? 0
    let composing = false
    this.addDisposable(
      editor.onDidChangeModel(() => {
        this.pending.value = null
        previousSource = editor.getValue()
        previousVersion = editor.getModel()?.getVersionId() ?? 0
      })
    )
    this.addDisposable(
      editor.onDidChangeModelContent((event) => {
        const source = editor.getValue()
        const oldSource = previousSource
        const oldVersion = previousVersion
        previousSource = source
        previousVersion = event.versionId
        const change = event.changes[0]
        const textDocument = this.ui.activeTextDocument
        if (
          composing ||
          event.isFlush ||
          event.isUndoing ||
          event.isRedoing ||
          !editor.hasTextFocus() ||
          editor.getSelections()?.length !== 1 ||
          event.changes.length !== 1 ||
          change == null ||
          textDocument == null ||
          editor.getPosition()?.lineNumber !== change.range.startLineNumber ||
          change.range.startLineNumber !== change.range.endLineNumber ||
          /[\r\n]/.test(change.text) ||
          !isIndependentCommand(oldSource, change.range.startLineNumber) ||
          !isIndependentCommand(source, change.range.startLineNumber)
        ) {
          this.pending.value = null
          return
        }
        const line = change.range.startLineNumber
        if (this.pending.value?.textDocument === textDocument && this.pending.value.line === line) return
        this.pending.value = null
        const baseline = this.diagnosticsMgr.result.data
        if (
          baseline == null ||
          baseline.textDocument !== textDocument ||
          baseline.version !== oldVersion ||
          baseline.source !== oldSource ||
          !sameFilesOutsideDocument(baseline.files, this.ui.project.exportFiles(), textDocument) ||
          baseline.diagnostics.some(
            (diagnostic) => diagnostic.range.start.line <= line && diagnostic.range.end.line >= line
          )
        )
          return
        this.pending.value = { textDocument, line, baselineVersion: oldVersion, files: this.ui.project.exportFiles() }
      })
    )
    this.addDisposable(
      editor.onDidChangeCursorPosition(({ position }) => {
        if (this.pending.value != null && position.lineNumber !== this.pending.value.line) this.reveal()
      })
    )
    this.addDisposable(editor.onDidBlurEditorWidget(() => this.reveal()))
    this.addDisposable(editor.onDidPaste(() => this.reveal()))
    this.addDisposable(
      editor.onDidCompositionStart(() => {
        composing = true
        this.reveal()
      })
    )
    this.addDisposable(
      editor.onDidCompositionEnd(() => {
        composing = false
      })
    )
  }
}
