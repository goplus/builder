<script lang="ts">
function getCls(suffix?: string) {
  return ['code-editor-input-helper', suffix].filter(Boolean).join('-')
}

/**
 * Check if the element stands for icon of a input helper.
 * If so, return the id of the input helper item.
 */
export function checkInputHelperIcon(el: HTMLElement): string | null {
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
import { ref, watchPostEffect } from 'vue'
import { useMessageHandle } from '@/utils/exception'
import { UIDropdown, type DropdownPos } from '@/components/ui'
import { type Input, exprForInput } from '../../common'
import type { monaco } from '../../monaco'
import { toMonacoRange, useDecorations } from '../common'
import { useCodeEditorUICtx } from '../CodeEditorUI.vue'
import InputHelper from './InputHelper.vue'
import { type InputHelperController } from '.'

const props = defineProps<{
  controller: InputHelperController
}>()

const codeEditorUICtx = useCodeEditorUICtx()

useDecorations(() => {
  const { activeSlots, inputingSlot } = props.controller
  const decorations: monaco.editor.IModelDeltaDecoration[] = []

  for (const slot of activeSlots) {
    decorations.push(
      {
        range: toMonacoRange(slot.range),
        options: {
          isWholeLine: false,
          after: {
            content: '\u200B', // Use zero-width space as content to make the character zero size
            inlineClassName: ['icon', `id-${slot.id}`].map(getCls).join(' '),
            inlineClassNameAffectsLetterSpacing: true
          }
        }
      },
      {
        range: toMonacoRange(slot.range),
        options: {
          isWholeLine: false,
          className: getCls('active-bg')
        }
      }
    )
  }

  if (inputingSlot != null) {
    decorations.push({
      range: toMonacoRange(inputingSlot.range),
      options: {
        isWholeLine: false,
        className: getCls('inputing-bg')
      }
    })
  }

  return decorations
})

const dropdownVisible = ref(false)
const dropdownPos = ref<DropdownPos>({ x: 0, y: 0 })

// Use post effect to ensure the effect executed after effect of `useDecorations`
watchPostEffect(async () => {
  const { inputingSlot } = props.controller
  if (inputingSlot == null) {
    dropdownVisible.value = false
    return
  }
  const editor = codeEditorUICtx.ui.editor
  editor.render(true) // ensure the decoration is rendered
  const decorationEl = editor.getDomNode()?.querySelector('.' + getCls('inputing-bg'))
  if (decorationEl == null) throw new Error('Decoration element not found')
  const rect = decorationEl.getBoundingClientRect()
  dropdownVisible.value = true
  dropdownPos.value = {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height
  }
})

const handleInputUpdate = useMessageHandle(
  (newInput: Input) => {
    const { inputingSlot } = props.controller
    if (inputingSlot == null) return
    const td = codeEditorUICtx.ui.activeTextDocument
    if (td == null) return
    const newCode = exprForInput(newInput)
    if (newCode == null) throw new Error('Invalid input')
    td.pushEdits([
      {
        range: inputingSlot.range,
        newText: newCode
      }
    ])
  },
  {
    en: 'Failed to update code',
    zh: '更新代码失败'
  }
).fn

function handleCancelInput() {
  props.controller.stopInputing()
}
</script>

<template>
  <UIDropdown
    :visible="dropdownVisible"
    trigger="manual"
    :pos="dropdownPos"
    placement="bottom"
    show-arrow
    :offset="{ x: 0, y: 10 }"
    @update:visible="handleCancelInput"
  >
    <InputHelper
      v-if="props.controller.inputingSlot != null"
      :key="props.controller.inputingSlot.id"
      :slot-kind="props.controller.inputingSlot.kind"
      :accept="props.controller.inputingSlot.accept"
      :input="props.controller.inputingSlot.input"
      :predefined-names="props.controller.inputingSlot.predefinedNames"
      @update:input="handleInputUpdate"
      @cancel="handleCancelInput"
    />
  </UIDropdown>
</template>

<style lang="scss">
.code-editor-input-helper-icon {
  position: relative;
  display: inline-block;
  aspect-ratio: 1 / 1;
  height: 100%;
  border-radius: 0 2px 2px 0;
  cursor: pointer;
  background-color: var(--ui-color-grey-400);
  transition: background-color 0.2s;
  &:hover {
    background-color: var(--ui-color-grey-500);
  }
  &::after {
    content: '';
    position: absolute;
    width: 100%;
    height: 100%;
    background: url(./pen.svg) no-repeat center center;
    background-size: 80% 80%;
  }
}

.code-editor-input-helper-inputing-bg {
  border-radius: 2px;
  background-color: var(--ui-color-grey-600);
}

.code-editor-input-helper-active-bg {
  border-radius: 2px 0 0 2px;
  background-color: var(--ui-color-grey-600);
}
</style>
