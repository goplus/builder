import { debounce } from 'lodash'
import { shallowRef, watch } from 'vue'
import { Disposable } from '@/utils/disposable'
import { Cancelled } from '@/utils/exception'
import { TaskManager } from '@/utils/task'
import type { Files } from '@/models/common/file'
import { DiagnosticSeverity, getCodeFilePath, type Diagnostic, type Position } from '../../common'
import type { TextDocument } from '../../text-document'
import type { monaco } from '../../monaco'
import type { CodeEditorUIController } from '../code-editor-ui'
import { findCallAt, findEnclosingBlock, type CallContext } from '../call-context'
import { sameFilesOutsideDocument } from '../editing-context'
import { mapBaselineDiagnostics, presentEditingDiagnostics } from './presentation'

export type { IDiagnosticsProvider, DiagnosticsContext } from '../../diagnostics'

type Edit = { start: number; end: number; text: string }
type OffsetRange = { start: number; end: number }
type Report = { diagnostics: Diagnostic[]; textDocument: TextDocument; source: string; version: number; files: Files }
type EditingSession = {
  baseline: Report
  baselineCall: OffsetRange
  call: CallContext
  block: OffsetRange | null
  edits: Edit[]
  defer: boolean
  creating: boolean
}

function offsetAt(source: string, position: Position) {
  const lines = source.split('\n')
  let offset = 0
  for (let i = 0; i < position.line - 1; i++) offset += (lines[i]?.length ?? 0) + 1
  return Math.min(source.length, offset + position.column - 1)
}

function mapRange(range: OffsetRange, edit: Edit) {
  const delta = edit.text.length - (edit.end - edit.start)
  return {
    start: edit.end <= range.start ? range.start + delta : range.start,
    end: edit.start <= range.end ? range.end + delta : range.end
  }
}

function editsAfterSource(baseline: string, checkpoint: string, edits: Edit[]) {
  let source = baseline
  let index: number | null = source === checkpoint ? 0 : null
  for (let i = 0; i < edits.length; i++) {
    const edit = edits[i]
    source = source.slice(0, edit.start) + edit.text + source.slice(edit.end)
    if (source === checkpoint) index = i + 1
  }
  return index == null ? null : edits.slice(index)
}

export class DiagnosticsController extends Disposable {
  constructor(private ui: CodeEditorUIController) {
    super()
  }

  private diagnosticsMgr = new TaskManager(async (signal): Promise<Report | null> => {
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
    signal.throwIfAborted()
    if (
      this.ui.simpleMode &&
      (this.ui.codeEditor.diagnosticsProvider !== provider ||
        this.ui.activeTextDocument !== textDocument ||
        textDocument.monacoTextModel.getVersionId() !== version ||
        this.ui.project.exportFiles() !== files)
    )
      throw new Cancelled('Stale diagnostics')
    const report = { diagnostics, textDocument, source, version, files }
    const session = this.session.value
    if (this.ui.simpleMode && session != null && session.baseline.textDocument === textDocument) {
      const hasCallError = diagnostics.some((diagnostic) => {
        const start = offsetAt(source, (diagnostic.sourceRange ?? diagnostic.range).start)
        return (
          diagnostic.severity === DiagnosticSeverity.Error && start >= session.call.start && start <= session.call.end
        )
      })
      if (!hasCallError) {
        this.session.value = session.defer
          ? {
              ...session,
              baseline: report,
              baselineCall: session.call,
              edits: [],
              creating: false
            }
          : null
      }
    }
    return report
  }, true)

  private session = shallowRef<EditingSession | null>(null)
  private refreshDiagnostics = debounce(() => this.diagnosticsMgr.start(), 100)

  get diagnostics() {
    const report = this.diagnosticsMgr.result.data
    if (report == null) return null
    if (!this.ui.simpleMode) return report.diagnostics
    const document = this.ui.activeTextDocument
    if (document == null || report.textDocument !== document) return null
    const session = this.session.value
    if (session == null || !sameFilesOutsideDocument(session.baseline.files, this.ui.project.exportFiles(), document)) {
      return report.diagnostics
    }
    const source = document.getValue()
    let diagnostics = report.diagnostics
    if (report.source !== source) {
      const edits = editsAfterSource(session.baseline.source, report.source, session.edits)
      diagnostics =
        edits == null
          ? mapBaselineDiagnostics(
              session.baseline.diagnostics.filter((d) => d.origin !== 'runtime'),
              session.baseline.source,
              source,
              session.edits
            )
          : mapBaselineDiagnostics(
              report.diagnostics.filter((d) => d.origin !== 'runtime'),
              report.source,
              source,
              edits
            )
    }
    return presentEditingDiagnostics({
      diagnostics,
      baseline: session.baseline.diagnostics,
      baselineSource: session.baseline.source,
      source,
      call: session.call,
      baselineCall: session.baselineCall,
      block: session.block,
      edits: session.edits,
      defer: session.defer
    })
  }

  reveal() {
    const session = this.session.value
    if (session != null) this.session.value = { ...session, defer: false }
    this.refreshDiagnostics.cancel()
    void this.diagnosticsMgr.start()
  }

  private trackEdit(
    oldSource: string,
    source: string,
    oldVersion: number,
    event: monaco.editor.IModelContentChangedEvent
  ) {
    const editor = this.ui.editor
    const document = this.ui.activeTextDocument
    const helper = this.ui.inputHelperController?.inputingSlot
    if (
      document == null ||
      event.isFlush ||
      event.isUndoing ||
      event.isRedoing ||
      (!editor.hasTextFocus() && helper == null) ||
      editor.getSelections()?.length !== 1 ||
      event.changes.length !== 1
    ) {
      this.session.value = null
      return
    }
    const change = event.changes[0]
    const start =
      change.rangeOffset ??
      offsetAt(oldSource, { line: change.range.startLineNumber, column: change.range.startColumn })
    const end =
      start +
      (change.rangeLength ??
        offsetAt(oldSource, { line: change.range.endLineNumber, column: change.range.endColumn }) - start)
    const edit = { start, end, text: change.text }
    const oldCall = findCallAt(oldSource, start)
    const newCall = findCallAt(source, start + change.text.length)
    const position = editor.getPosition()
    if (position == null || newCall == null) {
      this.session.value = null
      return
    }
    const cursor = offsetAt(source, { line: position.lineNumber, column: position.column })
    const oldCursor = offsetAt(oldSource, { line: position.lineNumber, column: position.column })
    if (
      helper == null &&
      !(cursor >= newCall.start && cursor <= newCall.end) &&
      !(oldCall != null && oldCursor >= oldCall.start && oldCursor <= oldCall.end)
    ) {
      this.session.value = null
      return
    }

    const previous = this.session.value
    if (
      previous != null &&
      previous.baseline.textDocument === document &&
      sameFilesOutsideDocument(previous.baseline.files, this.ui.project.exportFiles(), document) &&
      start >= (previous.creating ? previous.call.calleeStart : previous.call.calleeEnd) &&
      end <= previous.call.end &&
      (previous.creating || newCall.callee === previous.call.callee)
    ) {
      const mapped = mapRange(previous.call, edit)
      this.session.value = {
        ...previous,
        call: { ...newCall, start: mapped.start, end: Math.max(mapped.end, newCall.end) },
        block: previous.block == null ? null : mapRange(previous.block, edit),
        edits: [...previous.edits, edit]
      }
      return
    }

    this.session.value = null
    const baseline = this.diagnosticsMgr.result.data
    if (
      baseline == null ||
      baseline.textDocument !== document ||
      baseline.version !== oldVersion ||
      baseline.source !== oldSource ||
      !sameFilesOutsideDocument(baseline.files, this.ui.project.exportFiles(), document)
    )
      return
    const baselineCall = oldCall ?? { start, end }
    if (oldCall == null && oldSource.slice(start, end).trim() !== '') return
    if (oldCall != null && (oldCall.callee !== newCall.callee || start < oldCall.calleeEnd || end > oldCall.end)) return
    if (
      baseline.diagnostics.some((diagnostic) => {
        const range = diagnostic.sourceRange ?? diagnostic.range
        const a = offsetAt(oldSource, range.start)
        const b = offsetAt(oldSource, range.end)
        return a <= baselineCall.end && b >= baselineCall.start
      })
    )
      return
    const block = findEnclosingBlock(oldSource, start)
    const trackedCall = mapRange(baselineCall, edit)
    this.session.value = {
      baseline,
      baselineCall,
      call: {
        ...newCall,
        start: Math.min(trackedCall.start, newCall.start),
        end: Math.max(trackedCall.end, newCall.end)
      },
      block: block == null ? null : mapRange(block, edit),
      edits: [edit],
      defer: true,
      creating: oldCall == null
    }
  }

  init() {
    const refresh = this.refreshDiagnostics
    this.addDisposer(() => refresh.cancel())
    this.addDisposer(() => this.diagnosticsMgr.stop())
    this.addDisposer(
      watch(
        () => this.ui.codeEditor.diagnosticsProvider,
        (provider, _, onCleanup) => {
          this.session.value = null
          refresh()
          onCleanup(provider.on('didChangeDiagnostics', refresh))
        },
        { immediate: true }
      )
    )
    this.addDisposer(
      watch(
        () => [this.ui.project.exportFiles(), this.ui.activeTextDocument] as const,
        ([files, document]) => {
          const session = this.session.value
          if (
            session != null &&
            (session.baseline.textDocument !== document ||
              !sameFilesOutsideDocument(session.baseline.files, files, session.baseline.textDocument))
          )
            this.session.value = null
          refresh()
        },
        { immediate: true }
      )
    )
    if (!this.ui.simpleMode) return
    const editor = this.ui.editor
    let previousSource = editor.getValue()
    let previousVersion = editor.getModel()?.getVersionId() ?? 0
    this.addDisposable(
      editor.onDidChangeModel(() => {
        this.session.value = null
        previousSource = editor.getValue()
        previousVersion = editor.getModel()?.getVersionId() ?? 0
      })
    )
    this.addDisposable(
      editor.onDidChangeModelContent((event) => {
        const source = editor.getValue()
        this.trackEdit(previousSource, source, previousVersion, event)
        previousSource = source
        previousVersion = event.versionId
      })
    )
    this.addDisposable(
      editor.onDidChangeCursorPosition(({ position }) => {
        const session = this.session.value
        if (session == null || !session.defer) return
        const cursor = offsetAt(editor.getValue(), { line: position.lineNumber, column: position.column })
        if (cursor < session.call.start || cursor > session.call.end) this.reveal()
      })
    )
    this.addDisposable(
      editor.onDidBlurEditorWidget(() => {
        if (this.ui.inputHelperController?.inputingSlot == null) this.reveal()
      })
    )
    this.addDisposable(editor.onDidPaste(() => this.reveal()))
    // Composition alone does not mean the learner has left the current call.
    this.addDisposable(editor.onDidCompositionEnd(() => refresh()))
  }
}
