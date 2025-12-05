/**
 * @file Input Helper
 * @desc See details in https://github.com/goplus/builder/issues/1530
 */

import { debounce } from 'lodash'
import { shallowRef, watch } from 'vue'
import { Disposable } from '@/utils/disposable'
import { TaskManager } from '@/utils/task'
import { positionEq, type BaseContext, type InputSlot } from '../../common'
import type { CodeEditorUI } from '../code-editor-ui'
import { checkInputHelperIcon } from './InputHelperUI.vue'

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
    if (provider == null) return []
    const { activeTextDocument: textDocument } = this.ui
    if (textDocument == null) return []
    const items = await provider.provideInputSlots({ textDocument, signal })
    return items.map<InternalInputSlot>((item, i) => ({ ...item, id: i + '' }))
  }, true)

  get slots() {
    return this.mgr.result.data
  }

  get activeSlots() {
    const slots = this.slots
    if (slots == null) return null
    return slots.filter((slot) => this.ui.isNewlyInserted(slot.range.start) && this.ui.isNewlyInserted(slot.range.end))
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
  toggleInputing(slotId: string) {
    if (this.inputingSlot?.id === slotId) this.stopInputing()
    else this.startInputing(slotId)
  }

  init() {
    const { editor } = this.ui
    const refreshSlots = debounce(() => this.mgr.start(), 100)

    this.addDisposer(
      watch(
        () => [this.providerRef.value, this.ui.project.exportGameFiles(), this.ui.activeTextDocument],
        () => refreshSlots(),
        { immediate: true }
      )
    )

    this.addDisposer(
      watch(
        () => this.slots,
        (slots) => {
          if (this.inputingSlot != null && slots != null && !slots.includes(this.inputingSlot)) {
            const inputingStart = this.inputingSlot.range.start
            // When user inputing in the input helper, the code will be updated, which causes slots
            // to be updated. Here we try to find the corresponding slot in the new slot array.
            const updatedSlot = slots.find((s) => positionEq(s.range.start, inputingStart))
            if (updatedSlot != null) this.startInputing(updatedSlot.id)
            else this.stopInputing()
          }
        }
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
        const id = checkInputHelperIcon(e.target)
        if (id == null) return
        e.preventDefault()
        e.stopPropagation()
        clickingId = id
      },
      { capture: true, signal: this.getSignal() }
    )

    editorEl.addEventListener(
      'mouseup',
      (e) => {
        if (clickingId == null) return
        if (!(e.target instanceof HTMLElement)) return
        const id = checkInputHelperIcon(e.target)
        if (id != null && id === clickingId) {
          e.preventDefault()
          e.stopPropagation()
          this.toggleInputing(id)
        }
        clickingId = null
      },
      { capture: true, signal: this.getSignal() }
    )

    this.addDisposable(
      editor.onKeyDown((e) => {
        if (e.keyCode === this.ui.monaco.KeyCode.Escape) {
          this.stopInputing()
        }
      })
    )
    this.addDisposable(editor.onMouseDown(() => this.stopInputing()))
  }
}
