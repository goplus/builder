<script lang="ts">
function getCls(suffix?: string) {
  return ['code-editor-input-helper', suffix].filter(Boolean).join('-')
}

/**
 * Check if the element stands for icon of a input helper.
 * If so, return the id of the input helper item.
 */
export function checkInputHelper(el: HTMLElement): string | null {
  const clss = el.classList
  if (!clss.contains(getCls('icon'))) return null
  const idClsPrefix = getCls('id-')
  for (const cls of clss) {
    if (cls.startsWith(idClsPrefix)) return cls.slice(idClsPrefix.length)
  }
  return null
}
</script>

<script setup lang="ts">
import { watchEffect, ref, nextTick, watch } from 'vue'
import { UIDropdown, type DropdownPos } from '@/components/ui'
import { InputKind, type Input } from '../../common'
import type { monaco } from '../../monaco'
import { toAbsolutePosition, toMonacoRange, useDecorations } from '../common'
import { useCodeEditorUICtx } from '../CodeEditorUI.vue'
import { type InputHelperController } from '.'
import InputHelper from './InputHelper.vue'

const props = defineProps<{
  controller: InputHelperController
}>()

const codeEditorUICtx = useCodeEditorUICtx()

watch(
  () => props.controller.activeSlots,
  async (activeItems) => {
    if (activeItems.length === 0) return
    await nextTick()
    // TODO: Optimize implementation here
    props.controller['ui'].editor.setSelection(
      toMonacoRange({
        start: activeItems[0].range.end,
        end: activeItems[0].range.end
      })
    )
  }
)

useDecorations(() => {
  const { slots, activeSlots } = props.controller
  if (slots == null) return []

  const iconDecorations: monaco.editor.IModelDeltaDecoration[] = []
  for (const slot of slots) {
    const isActive = activeSlots.some((s) => s.id === slot.id)
    if (!isActive) continue
    const clss = ['icon', `id-${slot.id}`]
    iconDecorations.push({
      range: {
        startLineNumber: slot.range.start.line,
        startColumn: slot.range.start.column,
        endLineNumber: slot.range.end.line,
        endColumn: slot.range.end.column
      },
      options: {
        isWholeLine: false,
        after: {
          content: ' ',
          inlineClassName: clss.map(getCls).join(' '),
          inlineClassNameAffectsLetterSpacing: true
        }
      }
    })
  }
  const bgDecorations: monaco.editor.IModelDeltaDecoration[] = []
  for (const slot of slots) {
    const clss = ['bg', `id-${slot.id}`]
    const isActive = activeSlots.some((s) => s.id === slot.id)
    if (isActive) clss.push('active')
    bgDecorations.push({
      range: {
        startLineNumber: slot.range.start.line,
        startColumn: slot.range.start.column,
        endLineNumber: slot.range.end.line,
        endColumn: slot.range.end.column
      },
      options: {
        isWholeLine: false,
        inlineClassName: clss.map(getCls).join(' ')
      }
    })
  }
  return [...iconDecorations, ...bgDecorations]
})

const dropdownVisible = ref(false)
const dropdownPos = ref<DropdownPos>({ x: 0, y: 0 })

function handleSubmitInput(newInput: Input) {
  const { inputingSlot } = props.controller
  if (inputingSlot == null) return
  const td = codeEditorUICtx.ui.activeTextDocument
  if (td == null) return
  const newText = newInput.kind === InputKind.InPlace ? JSON.stringify(newInput.value) : newInput.name
  td.pushEdits([
    {
      range: inputingSlot.range,
      newText
    }
  ])
  dropdownVisible.value = false
}

watchEffect(() => {
  const { inputingSlot: inputing } = props.controller
  if (inputing == null) {
    dropdownVisible.value = false
    return
  }
  const aPos = toAbsolutePosition(inputing.range.start, codeEditorUICtx.ui.editor)
  if (aPos == null) {
    dropdownVisible.value = false
    return
  }
  dropdownVisible.value = true
  dropdownPos.value = {
    x: aPos.left,
    y: aPos.top,
    width: 0,
    height: aPos.height
  }
})

function handleCancelInput() {
  props.controller.stopInputing()
}
</script>

<template>
  <UIDropdown
    :visible="dropdownVisible"
    trigger="manual"
    :pos="dropdownPos"
    placement="bottom-start"
    :offset="{ x: 0, y: 4 }"
  >
    <InputHelper
      v-if="props.controller.inputingSlot != null"
      :slot-kind="props.controller.inputingSlot.kind"
      :input="props.controller.inputingSlot.input"
      :pre-defined-names="props.controller.inputingSlot.preDefinedNames"
      @cancel="handleCancelInput"
      @submit="handleSubmitInput"
    />
  </UIDropdown>
</template>

<style lang="scss">
.code-editor-input-helper-icon {
  position: relative;
  // TODO: consider zooming of editor
  width: 14px;
  height: 18px;
  display: inline-block;
  margin-right: 2px;
  vertical-align: top;
}

.code-editor-input-helper-icon {
  &::after {
    content: url(./edit.svg);
    position: absolute;
    top: 50%;
    left: 50%;
    width: 16px;
    height: 16px;
    transform: translate(-50%, -50%) scale(0.8);
    filter: opacity(0.6);
    cursor: pointer;
    background-color: rgba(0, 0, 0, 0.2);
  }
  &:hover::after {
    filter: opacity(1);
  }
}

.code-editor-input-helper-bg {
  &:hover {
    background-color: rgba(0, 0, 0, 0.3);
  }
  &.code-editor-input-helper-active {
    background-color: rgba(0, 0, 0, 0.3);
  }
}
</style>
