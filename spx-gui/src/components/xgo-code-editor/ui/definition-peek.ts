import { debounce } from 'lodash'
import { shallowRef, watch } from 'vue'
import { Disposable } from '@/utils/disposable'
import type { CodeEditor } from '../code-editor'
import { fromLSPRange, isRangeEmpty, toLSPPosition, type Position, type Range } from '../common'
import type { TextDocument } from '../text-document'
import type { HoverContext, IHoverProvider } from '../hover'
import { builtInCommandRename } from './code-editor-ui'
import { PeekLocation } from './peek-location'
import { readFunctionParameters } from './function-parameters'
import { FunctionChangeReview } from './function-change-review'

export type PeekReference = {
  textDocument: TextDocument
  range: Range
  code: string
}

export class DefinitionPeekController extends Disposable implements IHoverProvider {
  readonly definition: PeekLocation
  private currentRef = shallowRef<PeekLocation>()
  get current() {
    return this.currentRef.value!
  }
  private referencesRef = shallowRef<PeekReference[] | null>(null)
  private referenceAnchors: PeekLocation[] = []
  get review() {
    const review = this.codeEditor.functionChangeReview
    if (review == null || review.definition.textDocument !== this.definition.textDocument) return null
    const a = review.definition.range.start
    const b = this.definition.range.start
    return a.line === b.line && a.column === b.column ? review : null
  }
  get references() {
    return this.review?.references ?? this.referencesRef.value
  }
  private loadingRef = shallowRef(false)
  get loading() {
    return this.review == null && this.loadingRef.value
  }
  private failedRef = shallowRef(false)
  get failed() {
    return this.review == null && this.failedRef.value
  }
  private request: AbortController | null = null

  constructor(
    private codeEditor: CodeEditor,
    textDocument: TextDocument,
    range: Range
  ) {
    super()
    this.definition = new PeekLocation(textDocument, range, codeEditor.monaco)
    this.currentRef.value = this.definition
    this.addDisposable(this.definition)
    this.watchParameters()
    this.addDisposer(() => {
      this.request?.abort()
      this.referenceAnchors.forEach((anchor) => anchor.dispose())
      if (this.current !== this.definition) this.current.dispose()
    })
    const refresh = debounce(() => this.loadReferences(), 300)
    this.addDisposer(() => refresh.cancel())
    this.addDisposer(
      watch(
        () => codeEditor.project.exportFiles(),
        () => {
          this.request?.abort()
          this.loadingRef.value = true
          refresh()
        }
      )
    )
  }

  private watchParameters() {
    const doc = this.definition.textDocument
    let previousCode = doc.getValue()
    let previousNameEnd = doc.getOffsetAt(this.definition.range.end)
    const initial = readFunctionParameters(previousCode, previousNameEnd)
    if (initial == null) return
    let previousKey = initial.key
    const parameters = new PeekLocation(
      doc,
      {
        start: doc.getPositionAt(initial.start),
        end: doc.getPositionAt(initial.end)
      },
      this.codeEditor.monaco,
      true
    )
    this.addDisposable(parameters)
    this.addDisposable(
      doc.monacoTextModel.onDidChangeContent((event) => {
        const code = doc.getValue()
        const current = readFunctionParameters(code, doc.getOffsetAt(this.definition.range.end))
        const key = current?.key ?? doc.getValueInRange(parameters.range)
        const userEdit =
          !event.isFlush && !event.isUndoing && !event.isRedoing && !this.codeEditor.isApplyingWorkspaceEdit
        if (userEdit && key !== previousKey && this.codeEditor.functionChangeReview == null) {
          const references =
            this.referencesRef.value == null
              ? null
              : this.referenceAnchors.map((anchor) => ({
                  textDocument: anchor.textDocument,
                  range: anchor.range,
                  code: anchor.textDocument.getLineContent(anchor.range.start.line).trim()
                }))
          const previousParameters = readFunctionParameters(previousCode, previousNameEnd)
          this.codeEditor.setFunctionChangeReview(
            new FunctionChangeReview(
              this.codeEditor,
              this.definition,
              parameters,
              references,
              previousCode,
              previousParameters == null ? null : { ...previousParameters, changes: event.changes }
            )
          )
        }
        previousCode = code
        previousNameEnd = doc.getOffsetAt(this.definition.range.end)
        previousKey = key
      })
    )
  }

  showReference(reference: PeekReference) {
    if (this.loading || this.failed) return
    if (this.current !== this.definition) this.current.dispose()
    this.currentRef.value = new PeekLocation(reference.textDocument, reference.range, this.codeEditor.monaco)
  }

  showDefinition() {
    if (this.current !== this.definition) this.current.dispose()
    this.currentRef.value = this.definition
  }

  async provideHover(ctx: HoverContext, position: Position) {
    const hover = await this.codeEditor.hoverProvider.provideHover(ctx, position)
    if (hover == null) return null
    // Reuse the semantic rename action without introducing nested navigation in Peek.
    const actions = hover.actions.filter((action) => action.command === builtInCommandRename)
    return actions.length === 0 ? null : { ...hover, actions }
  }

  async loadReferences() {
    if (this.isDisposed) return
    this.request?.abort()
    const request = new AbortController()
    this.request = request
    this.loadingRef.value = true
    this.failedRef.value = false
    try {
      if (isRangeEmpty(this.definition.range)) {
        this.referencesRef.value = []
        return
      }
      const locations = await this.codeEditor.lspClient.textDocumentReferences(
        { signal: request.signal },
        {
          textDocument: this.definition.textDocument.id,
          position: toLSPPosition(this.definition.range.start),
          context: { includeDeclaration: false }
        }
      )
      if (request.signal.aborted) return
      const references = new Map<string, PeekReference>()
      for (const location of locations ?? []) {
        const textDocument = this.codeEditor.getTextDocument({ uri: location.uri })
        if (textDocument == null) continue
        const range = fromLSPRange(location.range)
        const key = `${location.uri}:${range.start.line}:${range.start.column}:${range.end.line}:${range.end.column}`
        references.set(key, { textDocument, range, code: textDocument.getLineContent(range.start.line).trim() })
      }
      this.referencesRef.value = [...references.values()].sort(
        (a, b) =>
          a.textDocument.id.uri.localeCompare(b.textDocument.id.uri) ||
          a.range.start.line - b.range.start.line ||
          a.range.start.column - b.range.start.column
      )
      this.referenceAnchors.forEach((anchor) => anchor.dispose())
      this.referenceAnchors = this.referencesRef.value.map(
        (reference) => new PeekLocation(reference.textDocument, reference.range, this.codeEditor.monaco)
      )
      this.review?.mergeReferences(this.referencesRef.value)
    } catch (error) {
      if (request.signal.aborted) return
      console.warn('Failed to load symbol references', error)
      this.referencesRef.value = null
      this.failedRef.value = true
    } finally {
      if (!request.signal.aborted) this.loadingRef.value = false
    }
  }
}
