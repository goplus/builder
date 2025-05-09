<script setup lang="ts">
import { ref, watchPostEffect } from 'vue'
import { UIDropdown, type DropdownPos } from '@/components/ui'
import { useDecorations } from '../common'
import { useCodeEditorUICtx } from '../CodeEditorUI.vue'
import MarkdownView from '../markdown/MarkdownView.vue'
import HoverCard from './HoverCard.vue'
import HoverCardContent from './HoverCardContent.vue'
import type { HoverController } from '.'

const props = defineProps<{
  controller: HoverController
}>()

const codeEditorUICtx = useCodeEditorUICtx()

const dropdownVisible = ref(false)
const dropdownPos = ref<DropdownPos>({ x: 0, y: 0 })
const hoveredTextCls = 'code-editor-hovered-text'

// Use post effect to ensure the effect executed after effect of `useDecorations`
watchPostEffect(async () => {
  const hover = props.controller.hover
  if (hover == null) {
    dropdownVisible.value = false
    return
  }

  const editor = codeEditorUICtx.ui.editor
  editor.render(true) // ensure the decoration is rendered
  const decorationEl = editor.getDomNode()?.getElementsByClassName(hoveredTextCls)[0]
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
        className: hoveredTextCls
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
    <HoverCard
      v-if="controller.hover != null"
      :contents="controller.hover.contents"
      :actions="controller.hover.actions"
      @mouseenter="controller.emit('cardMouseEnter')"
      @mouseleave="controller.emit('cardMouseLeave')"
      @action="controller.hideHover()"
    >
      <HoverCardContent v-for="(content, i) in controller.hover.contents" :key="i">
        <MarkdownView v-bind="content" />
      </HoverCardContent>
    </HoverCard>
  </UIDropdown>
</template>

<style lang="scss">
// TODO: special style for hovered text?
.code-editor-hovered-text {
  border-radius: 2px;
  background-color: var(--ui-color-grey-600);
}
</style>
