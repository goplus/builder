import { debounce } from 'lodash'
import { shallowRef, watch } from 'vue'
import { Disposable } from '@/utils/disposable'
import { TaskManager } from '@/utils/task'
import type { Position, Range } from '../../common'
import type { CodeEditorUI } from '../code-editor-ui'
import type { TextDocument } from '../../text-document'

export type ParameterHintItem = {
  name: string
  range: Range
}

export class ParameterHintController extends Disposable {
  constructor(private ui: CodeEditorUI) {
    super()
  }

  private getItem(keyword: string, textDocument: TextDocument): ParameterHintItem | null {
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
      this.getItem('setString', textDocument),
      this.getItem('setNumber', textDocument),
      this.getItem('setBoolean', textDocument)
    ].filter(item => item !== null) as ParameterHintItem[]
  }

  private mgr = new TaskManager(async () => {
    const textDocument = this.ui.activeTextDocument
    if (textDocument == null) throw new Error('No active text document')
    return this.getItems(textDocument)
  })

  get items() {
    return this.mgr.result.data
  }

  private inputingRef = shallowRef<ParameterHintItem | null>(null)
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
    const refreshDiagnostics = debounce(() => this.mgr.start(), 100)

    this.addDisposer(
      watch(
        () => [this.ui.project.filesHash, this.ui.activeTextDocument],
        () => refreshDiagnostics(),
        { immediate: true }
      )
    )
  }
}
