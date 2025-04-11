import { debounce } from 'lodash'
import { shallowRef, watch } from 'vue'
import { Disposable } from '@/utils/disposable'
import { TaskManager } from '@/utils/task'
import { containsPosition, type Position, type Range } from '../../common'
import type { CodeEditorUI } from '../code-editor-ui'
import type { TextDocument } from '../../text-document'
import { checkInputHelper } from './InputHelperUI.vue'
import type { monaco } from '../../monaco'
import { fromMonacoPosition } from '../common'

export enum InputHelperType {
  Resource = 'resource',
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  Color = 'color',
  Enum = 'enum',
}

export type InputHelperItem = {
  id: string
  type: InputHelperType
  range: Range
}

type HoverTarget =
  | {
      type: 'text'
      position: Position
    }
  | {
      type: 'other'
    }

const stringPattern = /"([^"]*)"|\bstr\w+/g
const numberPattern = /\b\d+\b|\bnum\w+/g
const booleanPattern = /\btrue\b|\bfalse\b|\bbool\w+/g
const colorPattern = /RGBA\(.*\)/g

export class InputHelperController extends Disposable {
  constructor(private ui: CodeEditorUI) {
    super()
  }

  private getItemsForType(type: InputHelperType, pattern: RegExp, textDocument: TextDocument): InputHelperItem[] {
    const content = textDocument.getValue()
    const items: InputHelperItem[] = []
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const match = pattern.exec(content)
      if (match == null) break
      const matched = match[0]
      const idx = match.index
      const offset = idx
      const startPos = textDocument.getPositionAt(offset)
      const endPos: Position = {
        line: startPos.line,
        column: startPos.column + matched.length
      }
      items.push({
        id: `${type}-${items.length}`,
        type,
        range: {
          start: startPos,
          end: endPos
        }
      })
    }
    return items
  }

  private getItems(textDocument: TextDocument) {
    return (window as any).items = [
      ...this.getItemsForType(InputHelperType.String, stringPattern, textDocument),
      ...this.getItemsForType(InputHelperType.Number, numberPattern, textDocument),
      ...this.getItemsForType(InputHelperType.Boolean, booleanPattern, textDocument),
      ...this.getItemsForType(InputHelperType.Color, colorPattern, textDocument)
    ]
  }

  private mgr = new TaskManager(async () => {
    const textDocument = this.ui.activeTextDocument
    if (textDocument == null) throw new Error('No active text document')
    return this.getItems(textDocument)
  })

  get items() {
    return this.mgr.result.data
  }

  private hoveredRef = shallowRef<InputHelperItem | null>(null)
  get hovered() {
    return this.hoveredRef.value
  }

  // private activeItemsRef = shallowRef<InputHelperItem[]>([])
  get activeItems() {
    const newlyInsertedRange = this.ui.newlyInsertedRange
    if (newlyInsertedRange == null) return []
    const items = this.items
    if (items == null) return []
    return items.filter((item) => containsPosition(newlyInsertedRange, item.range.start) && containsPosition(newlyInsertedRange, item.range.end))
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
    const { monaco, editor } = this.ui
    const refreshDiagnostics = debounce(() => this.mgr.start(), 100)

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

    const handleMouseEnter = (target: HoverTarget) => {
      if (target.type === 'other') {
        this.hoveredRef.value = null
        return
      }
      if (target.type !== 'text') return
      const position = target.position
      const currentHover = this.hovered
      if (currentHover != null && containsPosition(currentHover.range, position)) return
      const hovered = this.items?.find((item) => containsPosition(item.range, position)) ?? null
      this.hoveredRef.value = hovered
    }

    this.addDisposable(
      editor.onMouseMove((e: monaco.editor.IEditorMouseEvent) => {
        if (e.target.type !== monaco.editor.MouseTargetType.CONTENT_TEXT) {
          handleMouseEnter({ type: 'other' })
          return
        }
        const position = fromMonacoPosition(e.target.position)
        handleMouseEnter({ type: 'text', position })
      })
    )

    // Attach event to the dom element with `capture` instead of listening to monaco-editor,
    // to avoid cursor-change when user clicking on interactive resource reference icon
    editorEl.addEventListener(
      'mousedown',
      (e) => {
        if (!(e.target instanceof HTMLElement)) return
        const rrId = checkInputHelper(e.target)
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
        const rrId = checkInputHelper(e.target)
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
