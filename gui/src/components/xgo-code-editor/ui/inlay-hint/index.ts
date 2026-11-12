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
import {
  callHasMissingArguments,
  createCallParameterBinding,
  filterIncompleteCallParameterHints,
  getRetainedParameters,
  mergeCallParameterHints,
  updateCallParameterBinding,
  type CallParameterBinding,
  type PresentedInlayHintItem
} from './retained-parameter'

export * from '../../inlay-hint'

type HintSnapshot = { textDocument: ITextDocument; source: string; files: Files; items: InlayHintItem[] }
type BindingSnapshot = { textDocument: ITextDocument; files: Files; binding: CallParameterBinding }

export class InlayHintController extends Disposable {
  constructor(private ui: CodeEditorUIController) {
    super()
  }

  private responseRef = shallowRef<HintSnapshot | null>(null)
  private confirmedRef = shallowRef<HintSnapshot | null>(null)
  private bindingRef = shallowRef<BindingSnapshot | null>(null)
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
      const trustedItems = filterIncompleteCallParameterHints(source, items)
      const snapshot = { textDocument, source, files, items: trustedItems }
      this.responseRef.value = snapshot
      const bound = this.bindingRef.value
      if (bound == null || !callHasMissingArguments(bound.binding)) {
        this.confirmedRef.value = snapshot
        if (bound != null && bound.binding.source === source) {
          const argument = bound.binding.call.arguments[0]
          const binding =
            argument == null ? null : createCallParameterBinding(source, trustedItems, argument.start, argument.end)
          this.bindingRef.value = binding == null ? null : { textDocument, files, binding }
        }
      }
    }
    return items
  }, true)

  get items(): PresentedInlayHintItem[] | null {
    if (!this.ui.simpleMode) return this.mgr.result.data
    if (this.composingRef.value) return []
    const response = this.responseRef.value
    const textDocument = this.ui.activeTextDocument
    const source = textDocument?.getValue()
    const files = this.ui.project.exportFiles()
    const currentResponse =
      response != null &&
      response.textDocument === textDocument &&
      response.files === files &&
      response.source === source
    const items = currentResponse ? response.items : []
    const bound = this.bindingRef.value
    if (
      bound == null ||
      bound.textDocument !== textDocument ||
      bound.binding.source !== source ||
      !sameFilesOutsideDocument(bound.files, files, bound.textDocument)
    )
      return items
    if (!currentResponse) return getRetainedParameters(bound.binding)
    return mergeCallParameterHints(bound.binding, items)
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
      const clearBinding = () => {
        this.confirmedRef.value = null
        this.bindingRef.value = null
      }
      this.addDisposer(
        watch(
          () => this.ui.project.exportFiles(),
          (files) => {
            const snapshot = this.bindingRef.value ?? this.confirmedRef.value
            if (snapshot != null && !sameFilesOutsideDocument(snapshot.files, files, snapshot.textDocument))
              clearBinding()
          },
          { flush: 'sync' }
        )
      )
      this.addDisposer(
        watch(
          () => this.ui.activeTextDocument,
          () => {
            this.responseRef.value = null
            clearBinding()
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
            clearBinding()
            refresh()
          },
          { flush: 'sync' }
        )
      )
      this.addDisposable(
        editor.onDidChangeModelContent((event) => {
          const textDocument = this.ui.activeTextDocument
          const source = textDocument?.getValue() ?? ''
          const files = this.ui.project.exportFiles()
          const change = event.changes[0]
          const confirmed = this.confirmedRef.value
          let bound = this.bindingRef.value
          if (
            bound == null &&
            confirmed != null &&
            confirmed.textDocument === textDocument &&
            confirmed.source === previousSource &&
            sameFilesOutsideDocument(confirmed.files, files, confirmed.textDocument) &&
            event.changes.length === 1
          ) {
            const binding = createCallParameterBinding(
              previousSource,
              confirmed.items,
              change.rangeOffset,
              change.rangeOffset + change.rangeLength
            )
            if (binding != null) bound = { textDocument: confirmed.textDocument, files: confirmed.files, binding }
          }
          const binding =
            bound != null &&
            bound.textDocument === textDocument &&
            bound.binding.source === previousSource &&
            sameFilesOutsideDocument(bound.files, files, bound.textDocument) &&
            !this.composingRef.value &&
            !event.isFlush &&
            !event.isUndoing &&
            !event.isRedoing
              ? updateCallParameterBinding(bound.binding, source, event.changes)
              : null
          if (binding == null || bound == null) clearBinding()
          else this.bindingRef.value = { ...bound, binding }
          previousSource = source
          refresh()
        })
      )
      this.addDisposable(
        editor.onDidCompositionStart(() => {
          this.composingRef.value = true
          this.responseRef.value = null
          clearBinding()
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
