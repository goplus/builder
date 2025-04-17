<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { UIDropdown, type DropdownPos } from '@/components/ui'
import { toAbsolutePosition, useDecorations } from '../common'
import { useCodeEditorUICtx } from '../CodeEditorUI.vue'
import type { HoverController } from '.'
import HoverCard from './HoverCard.vue'

const props = defineProps<{
  controller: HoverController
}>()

const codeEditorUICtx = useCodeEditorUICtx()

const dropdownVisible = ref(false)
const dropdownPos = ref<DropdownPos>({ x: 0, y: 0 })

watchEffect(() => {
  const hover = props.controller.hover
  if (hover == null) {
    dropdownVisible.value = false
    return
  }
  const aPos = toAbsolutePosition(hover.range.start, codeEditorUICtx.ui.editor)
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

useDecorations(() => {
  const hover = props.controller.hover
  if (hover == null) return []
  return [
    {
      range: {
        startLineNumber: hover.range.start.line,
        startColumn: hover.range.start.column,
        endLineNumber: hover.range.end.line,
        endColumn: hover.range.end.column
      },
      options: {
        isWholeLine: false,
        inlineClassName: 'code-editor-hovered-text'
      }
    }
  ]
})
</script>

<template>
  <UIDropdown
    :visible="dropdownVisible"
    trigger="manual"
    :pos="dropdownPos"
    placement="top-start"
    :offset="{ x: 0, y: 4 }"
  >
    <HoverCard v-if="controller.hover != null" :hover="controller.hover" :controller="controller" />
  </UIDropdown>
</template>

<style lang="scss">
// TODO: special style for hovered text?
/* .code-editor-hovered-text {
  background-color: rgba(0, 0, 0, 0.2);
} */
</style>
