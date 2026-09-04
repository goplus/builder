import { shallowRef } from 'vue'
import { diffChars } from 'diff'
import { Disposable } from '@/utils/disposable'
import type { CodeEditor } from '../code-editor'
import { getTextDocumentId, type Range, type TextEdit } from '../common'
import type { TextDocument } from '../text-document'
import type { monaco } from '../monaco'
import type { PeekReference } from './definition-peek'
import { PeekLocation } from './peek-location'
import { readFunctionParameters } from './function-parameters'

export type ReviewCall = {
  id: number
  location: PeekLocation
  line: PeekLocation
}

type Guard = { location: PeekLocation; start: number; end: number; callId: number | null }
type DocumentReview = { original: string; guards: Guard[] }

function restoreDocument(doc: TextDocument, original: string) {
  const edits: TextEdit[] = []
  let offset = 0
  let start: number | null = null
  let replacement = ''
  const flush = () => {
    if (start == null) return
    edits.push({ range: { start: doc.getPositionAt(start), end: doc.getPositionAt(offset) }, newText: replacement })
    start = null
    replacement = ''
  }
  for (const change of diffChars(doc.getValue(), original)) {
    if (!change.added && !change.removed) {
      flush()
      offset += change.value.length
    } else {
      start ??= offset
      if (change.added) replacement += change.value
      else offset += change.value.length
    }
  }
  flush()
  // Minimal edits preserve the Peek selection and tracked definition/reference anchors.
  if (edits.length > 0) doc.pushEdits(edits)
}

export class FunctionChangeReview extends Disposable {
  readonly definition: PeekLocation
  readonly parameters: PeekLocation
  readonly name: string
  readonly referencesIncomplete: boolean
  private callsRef = shallowRef<ReviewCall[]>([])
  get calls() {
    return this.callsRef.value
  }
  private checkedRef = shallowRef(new Set<number>())
  private conflictRef = shallowRef(false)
  get hasConflictingEdits() {
    return this.conflictRef.value
  }
  private revision = shallowRef(0)
  private restoring = false
  private originals = new Map<TextDocument, string>()
  private documents = new Map<TextDocument, DocumentReview>()

  constructor(
    private codeEditor: CodeEditor,
    definition: PeekLocation,
    parameters: PeekLocation,
    references: PeekReference[] | null,
    originalDefinitionCode: string,
    initialChange: { start: number; end: number; changes: monaco.editor.IModelContentChange[] } | null = null
  ) {
    super()
    this.definition = new PeekLocation(definition.textDocument, definition.range, codeEditor.monaco)
    this.parameters = new PeekLocation(parameters.textDocument, parameters.range, codeEditor.monaco, true)
    this.addDisposable(this.definition)
    this.addDisposable(this.parameters)
    this.name = definition.textDocument.getValueInRange(definition.range)
    this.referencesIncomplete = references == null
    if (
      initialChange != null &&
      initialChange.changes.some(
        (change) =>
          change.rangeOffset < initialChange.start || change.rangeOffset + change.rangeLength > initialChange.end
      )
    ) {
      this.conflictRef.value = true
    }
    for (const path of codeEditor.project.getCodeFiles()) {
      const doc = codeEditor.getTextDocument(getTextDocumentId(path))
      if (doc != null) this.originals.set(doc, doc.getValue())
    }
    this.originals.set(definition.textDocument, originalDefinitionCode)
    this.addGuard(this.parameters, null)
    this.mergeReferences(references ?? [])
  }

  private getOffsets(location: PeekLocation) {
    return {
      start: location.textDocument.getOffsetAt(location.range.start),
      end: location.textDocument.getOffsetAt(location.range.end)
    }
  }

  private addGuard(location: PeekLocation, callId: number | null) {
    const doc = location.textDocument
    let state = this.documents.get(doc)
    if (state == null) {
      const original = this.originals.get(doc)
      if (original == null || (doc !== this.definition.textDocument && original !== doc.getValue())) {
        this.conflictRef.value = true
      }
      state = { original: original ?? doc.getValue(), guards: [] }
      this.documents.set(doc, state)
      const initialVersion = doc.monacoTextModel.getVersionId()
      this.addDisposable(
        doc.monacoTextModel.onDidChangeContent((event) => {
          if (this.restoring || event.versionId === initialVersion) return
          this.handleChanges(doc, event)
        })
      )
    }
    state.guards.push({ location, callId, ...this.getOffsets(location) })
  }

  private handleChanges(doc: TextDocument, event: monaco.editor.IModelContentChangedEvent) {
    const state = this.documents.get(doc)!
    const checked = new Set(this.checkedRef.value)
    for (const change of event.changes) {
      const start = change.rangeOffset
      const end = start + change.rangeLength
      const touched = state.guards.filter((guard) => start <= guard.end && end >= guard.start)
      if (!touched.some((guard) => start >= guard.start && end <= guard.end)) this.conflictRef.value = true
      for (const guard of touched) {
        if (guard.callId == null) checked.clear()
        else checked.delete(guard.callId)
      }
    }
    state.guards.forEach((guard) => Object.assign(guard, this.getOffsets(guard.location)))
    this.checkedRef.value = checked
    this.revision.value++
    if ([...this.documents].every(([document, state]) => document.getValue() === state.original)) {
      this.codeEditor.setFunctionChangeReview(null)
    }
  }

  mergeReferences(references: PeekReference[]) {
    for (const reference of references) {
      if (
        this.calls.some(
          (call) =>
            call.location.textDocument === reference.textDocument &&
            call.location.range.start.line === reference.range.start.line &&
            call.location.range.start.column === reference.range.start.column
        )
      )
        continue
      const location = new PeekLocation(reference.textDocument, reference.range, this.codeEditor.monaco)
      const lineRange: Range = {
        start: { line: reference.range.start.line, column: 1 },
        end: {
          line: reference.range.end.line,
          column: reference.textDocument.getLineContent(reference.range.end.line).length + 1
        }
      }
      const line = new PeekLocation(reference.textDocument, lineRange, this.codeEditor.monaco, true)
      this.addDisposable(location)
      this.addDisposable(line)
      const call = { id: this.calls.length + 1, location, line }
      this.callsRef.value = [...this.calls, call]
      this.addGuard(line, call.id)
    }
  }

  get references(): PeekReference[] {
    return this.calls.map(({ location }) => ({
      textDocument: location.textDocument,
      range: location.range,
      code: location.textDocument.getLineContent(location.range.start.line).trim()
    }))
  }

  isChecked(call: ReviewCall) {
    return this.checkedRef.value.has(call.id)
  }
  markChecked(call: ReviewCall) {
    this.checkedRef.value = new Set([...this.checkedRef.value, call.id])
  }
  get remaining() {
    return this.calls.filter((call) => !this.isChecked(call))
  }
  get parametersComplete() {
    void this.revision.value
    const doc = this.definition.textDocument
    return readFunctionParameters(doc.getValue(), doc.getOffsetAt(this.definition.range.end)) != null
  }
  get canComplete() {
    return this.parametersComplete && !this.referencesIncomplete && this.remaining.length === 0
  }
  get canUndo() {
    void this.revision.value
    return (
      !this.hasConflictingEdits && [...this.documents].every(([doc]) => this.codeEditor.getTextDocument(doc.id) === doc)
    )
  }

  async undo() {
    if (!this.canUndo) return
    await this.codeEditor.history.doAction({ name: { en: 'Undo function adjustment', zh: '撤销函数调整' } }, () => {
      // Recheck inside the history mutex; never overwrite an intervening edit.
      if (!this.canUndo) return
      this.restoring = true
      try {
        for (const [doc, state] of this.documents) {
          restoreDocument(doc, state.original)
        }
        this.codeEditor.setFunctionChangeReview(null)
      } finally {
        this.restoring = false
      }
    })
  }

  complete() {
    if (this.canComplete) this.codeEditor.setFunctionChangeReview(null)
  }
}
