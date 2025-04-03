import { debounce } from 'lodash'
import { shallowRef, watch } from 'vue'
import { Disposable } from '@/utils/disposable'
import { TaskManager } from '@/utils/task'
import type { Position, Range } from '../../common'
import type { CodeEditorUI } from '../code-editor-ui'
import type { TextDocument } from '../../text-document'
import { checkModifiable } from './InputHelperUI.vue'

export enum InputHelperType {
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  Enum = 'enum',
}

export type InputHelperItem = {
  id: string
  type: InputHelperType
  range: Range
}

export class InputHelperController extends Disposable {
  constructor(private ui: CodeEditorUI) {
    super()
  }

  private getItem(type: InputHelperType, keyword: string, textDocument: TextDocument): InputHelperItem | null {
    const content = textDocument.getValue()
    const keywordIdx = content.indexOf(keyword)
    if (keywordIdx === -1) return null
    const stringOffset = keywordIdx + keyword.length + 1
    const stringStart = textDocument.getPositionAt(stringOffset)
    const stringEnd: Position = {
      line: stringStart.line,
      column: textDocument.getLineContent(stringStart.line).length + 1
    }
    return {
      id: `${type}-${keywordIdx}`,
      type,
      range: {
        start: stringStart,
        end: stringEnd
      }
    }
  }

  private getItems(textDocument: TextDocument) {
    return [
      this.getItem(InputHelperType.String, 'setString', textDocument),
      this.getItem(InputHelperType.Number, 'setNumber', textDocument),
      this.getItem(InputHelperType.Boolean, 'setBoolean', textDocument)
    ].filter(item => item !== null) as InputHelperItem[]
  }

  private diagnosticsMgr = new TaskManager(async () => {
    const textDocument = this.ui.activeTextDocument
    if (textDocument == null) throw new Error('No active text document')
    return this.getItems(textDocument)
  })

  get items() {
    return this.diagnosticsMgr.result.data
  }

  private inputingRef = shallowRef<InputHelperItem | null>(null)
  get inputing() {
    return this.inputingRef.value
  }

  startInputing(rrId: string) {
    this.inputingRef.value = this.items?.find((item) => item.id === rrId) ?? null
  }
  stopInputing() {
    this.inputingRef.value = null
    this.ui.editor.focus()
  }

  init() {
    const { editor } = this.ui
    const refreshDiagnostics = debounce(() => this.diagnosticsMgr.start(), 100)

    this.addDisposer(
      watch(
        () => [this.ui.project.filesHash, this.ui.activeTextDocument],
        () => refreshDiagnostics(),
        { immediate: true }
      )
    )

    const editorEl = editor.getDomNode()
    if (editorEl == null) throw new Error('No editor dom node')

    let clickingId: string | null = null

    // Attach event to the dom element with `capture` instead of listening to monaco-editor,
    // to avoid cursor-change when user clicking on interactive resource reference icon
    editorEl.addEventListener(
      'mousedown',
      (e) => {
        if (!(e.target instanceof HTMLElement)) return
        const rrId = checkModifiable(e.target)
        if (rrId == null) return
        e.preventDefault()
        e.stopPropagation()
        clickingId = rrId
      },
      { capture: true, signal: this.getSignal() }
    )

    editorEl.addEventListener(
      'mouseup',
      (e) => {
        if (clickingId == null) return
        if (!(e.target instanceof HTMLElement)) return
        const rrId = checkModifiable(e.target)
        if (rrId != null && rrId === clickingId) {
          e.preventDefault()
          e.stopPropagation()
          this.startInputing(rrId)
        }
        clickingId = null
      },
      { capture: true, signal: this.getSignal() }
    )

    this.addDisposable(editor.onMouseDown(() => this.stopInputing()))
  }
}
