/**
 * @file Input Helper
 * @desc See details in https://github.com/goplus/builder/issues/1530
 */

import { debounce } from 'lodash'
import { shallowRef, watch } from 'vue'
import { Disposable } from '@/utils/disposable'
import { TaskManager } from '@/utils/task'
import { containsPosition, type BaseContext, type InputSlot } from '../../common'
import type { CodeEditorUI } from '../code-editor-ui'
import { checkInputHelper } from './InputHelperUI.vue'

export type InputHelperContext = BaseContext

export type InternalInputSlot = InputSlot & {
  id: string
}

export interface IInputHelperProvider {
  provideInputSlots(ctx: InputHelperContext): Promise<InputSlot[]>
}

export class InputHelperController extends Disposable {
  private providerRef = shallowRef<IInputHelperProvider | null>(null)
  registerProvider(provider: IInputHelperProvider) {
    this.providerRef.value = provider
  }

  constructor(private ui: CodeEditorUI) {
    super()
  }

  private mgr = new TaskManager(async (signal) => {
    const provider = this.providerRef.value
    if (provider == null) throw new Error('No provider registered')
    const { activeTextDocument: textDocument } = this.ui
    if (textDocument == null) throw new Error('No active text document')
    const items = await provider.provideInputSlots({ textDocument, signal })
    return items.map<InternalInputSlot>((item, i) => ({ ...item, id: i + '' }))
  })

  get slots() {
    return this.mgr.result.data
  }

  get activeSlots() {
    const newlyInsertedRange = this.ui.newlyInsertedRange
    if (newlyInsertedRange == null) return []
    const slots = this.slots
    if (slots == null) return []
    return slots.filter(
      (slot) =>
        containsPosition(newlyInsertedRange, slot.range.start) && containsPosition(newlyInsertedRange, slot.range.end)
    )
  }

  private inputingSlotRef = shallowRef<InternalInputSlot | null>(null)
  get inputingSlot() {
    return this.inputingSlotRef.value
  }

  startInputing(slotId: string) {
    this.inputingSlotRef.value = this.slots?.find((item) => item.id === slotId) ?? null
  }
  stopInputing() {
    this.inputingSlotRef.value = null
    this.ui.editor.focus()
  }

  init() {
    const { editor } = this.ui
    const refreshSlots = debounce(() => this.mgr.start(), 100)

    this.addDisposer(
      watch(
        () => [this.ui.project.filesHash, this.ui.activeTextDocument],
        () => refreshSlots(),
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
