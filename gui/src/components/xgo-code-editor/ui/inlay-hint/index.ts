import { debounce } from 'lodash'
import { shallowRef, watch } from 'vue'
import { Disposable } from '@/utils/disposable'
import { Cancelled } from '@/utils/exception'
import { TaskManager } from '@/utils/task'
import type { Files } from '@/models/common/file'
import { getCodeFilePath, type ITextDocument } from '../../common'
import type { InlayHintItem } from '../../inlay-hint'
import type { CodeEditorUIController } from '../code-editor-ui'
import { sameFilesOutsideDocument } from '../editing-context'
import { retainDeletedParameter, type PresentedInlayHintItem } from './retained-parameter'

export * from '../../inlay-hint'

type HintSnapshot = { textDocument: ITextDocument; source: string; files: Files; items: InlayHintItem[] }

export class InlayHintController extends Disposable {
  constructor(private ui: CodeEditorUIController) {
    super()
  }

  private responseRef = shallowRef<HintSnapshot | null>(null)
  private confirmedRef = shallowRef<HintSnapshot | null>(null)
  private retainedRef = shallowRef<PresentedInlayHintItem[]>([])
  private composingRef = shallowRef(false)

  private mgr = new TaskManager(async (signal) => {
    const provider = this.ui.codeEditor.inlayHintProvider
    const { activeTextDocument: textDocument } = this.ui
    if (textDocument == null) return []
    const source = textDocument.getValue()
    const files = this.ui.project.exportFiles()
    if (this.ui.simpleMode) {
      const owner = this.ui.project.getCodeOwner(getCodeFilePath(textDocument.id.uri))
      if (owner?.getCode() !== source) throw new Cancelled('Project code is still synchronizing')
    }
    const items = await provider.provideInlayHints({ textDocument, signal })
    if (this.ui.simpleMode) {
      signal.throwIfAborted()
      if (
        this.isDisposed ||
        this.composingRef.value ||
        this.ui.codeEditor.inlayHintProvider !== provider ||
        this.ui.activeTextDocument !== textDocument ||
        this.ui.project.exportFiles() !== files ||
        this.ui.project.getCodeOwner(getCodeFilePath(textDocument.id.uri))?.getCode() !== source ||
        textDocument.getValue() !== source
      )
        return []
      const snapshot = { textDocument, source, files, items }
      this.responseRef.value = snapshot
      if (items.length > 0 || this.retainedRef.value.length === 0) this.confirmedRef.value = snapshot
    }
    return items
  }, true)

  get items(): PresentedInlayHintItem[] | null {
    if (!this.ui.simpleMode) return this.mgr.result.data
    if (this.composingRef.value) return []
    const response = this.responseRef.value
    const textDocument = this.ui.activeTextDocument
    const files = this.ui.project.exportFiles()
    const items =
      response != null &&
      response.textDocument === textDocument &&
      response.files === files &&
      response.source === textDocument?.getValue()
        ? response.items
        : []
    const confirmed = this.confirmedRef.value
    const retained =
      confirmed != null &&
      confirmed.textDocument === textDocument &&
      sameFilesOutsideDocument(confirmed.files, files, confirmed.textDocument)
        ? this.retainedRef.value
        : []
    return [...items, ...retained.filter((hint) => !items.some((i) => i.position.line === hint.position.line))]
  }

  init() {
    const refresh = debounce(() => this.mgr.start(), 100)
    this.addDisposer(() => {
      refresh.cancel()
      this.mgr.stop()
    })

    if (this.ui.simpleMode) {
      const { editor } = this.ui
      let previousSource = this.ui.activeTextDocument?.getValue() ?? ''
      const clearRetained = () => {
        this.confirmedRef.value = null
        this.retainedRef.value = []
      }
      this.addDisposer(
        watch(
          () => this.ui.project.exportFiles(),
          (files) => {
            const confirmed = this.confirmedRef.value
            if (confirmed != null && !sameFilesOutsideDocument(confirmed.files, files, confirmed.textDocument))
              clearRetained()
          },
          { flush: 'sync' }
        )
      )
      this.addDisposer(
        watch(
          () => this.ui.activeTextDocument,
          () => {
            this.responseRef.value = null
            clearRetained()
            previousSource = this.ui.activeTextDocument?.getValue() ?? ''
          },
          { flush: 'sync' }
        )
      )
      this.addDisposer(
        watch(
          () => this.ui.codeEditor.inlayHintProvider,
          () => {
            this.responseRef.value = null
            clearRetained()
            refresh()
          },
          { flush: 'sync' }
        )
      )
      this.addDisposable(
        editor.onDidChangeModelContent((event) => {
          const textDocument = this.ui.activeTextDocument
          const source = textDocument?.getValue() ?? ''
          const confirmed = this.confirmedRef.value
          const position = editor.getPosition()
          const retained =
            confirmed != null &&
            confirmed.textDocument === textDocument &&
            sameFilesOutsideDocument(confirmed.files, this.ui.project.exportFiles(), confirmed.textDocument) &&
            !this.composingRef.value &&
            !event.isFlush &&
            !event.isUndoing &&
            !event.isRedoing
              ? retainDeletedParameter(
                  confirmed.source,
                  previousSource,
                  source,
                  confirmed.items,
                  event.changes,
                  position == null ? null : { line: position.lineNumber, column: position.column }
                )
              : null
          if (retained == null) clearRetained()
          else this.retainedRef.value = [retained]
          previousSource = source
          refresh()
        })
      )
      this.addDisposable(
        editor.onDidChangeCursorPosition(({ position }) => {
          const retained = this.retainedRef.value[0]
          if (
            retained != null &&
            (position.lineNumber !== retained.position.line || position.column < retained.position.column)
          )
            clearRetained()
        })
      )
      this.addDisposable(editor.onDidBlurEditorText(clearRetained))
      this.addDisposable(
        editor.onDidCompositionStart(() => {
          this.composingRef.value = true
          this.responseRef.value = null
          clearRetained()
        })
      )
      this.addDisposable(
        editor.onDidCompositionEnd(() => {
          this.composingRef.value = false
          refresh()
        })
      )
    }

    this.addDisposer(
      watch(
        () => [this.ui.project.exportFiles(), this.ui.activeTextDocument],
        () => refresh(),
        { immediate: true }
      )
    )
  }
}
