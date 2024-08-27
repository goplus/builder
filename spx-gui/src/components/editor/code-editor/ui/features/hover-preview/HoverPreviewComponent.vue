<script setup lang="ts">
import type { HoverPreview } from './hover-preview'
import DocumentPreview from './DocumentPreview.vue'
import { editor as IEditor } from 'monaco-editor'
const props = defineProps<{
  hoverPreview: HoverPreview
}>()
const hoverPreviewState = props.hoverPreview.hoverPreviewState

props.hoverPreview.onMousemove((e) => {
  if (e.type !== IEditor.MouseTargetType.CONTENT_TEXT) return props.hoverPreview.hideDocument(true)

  const position = props.hoverPreview.editor.getModel()?.getWordAtPosition({
    column: e.range.startColumn,
    lineNumber: e.range.startLineNumber
  })
  if (!position || !position.word) return props.hoverPreview.hideDocument(true)
  const { startColumn, endColumn } = position
  const lineNumber = e.position.lineNumber
  if (
    (lineNumber === hoverPreviewState.range.startLineNumber &&
      endColumn <= hoverPreviewState.range.startColumn) ||
    (lineNumber === hoverPreviewState.range.endLineNumber &&
      startColumn >= hoverPreviewState.range.endColumn) ||
    lineNumber < hoverPreviewState.range.startLineNumber ||
    lineNumber > hoverPreviewState.range.endLineNumber
  ) {
    return props.hoverPreview.hideDocument(true)
  }
})

props.hoverPreview.onShowDocument((range) => {
  const containerRect = props.hoverPreview.editor.getContainerDomNode().getBoundingClientRect()
  const scrolledVisiblePosition = props.hoverPreview.editor.getScrolledVisiblePosition({
    lineNumber: range.endLineNumber,
    column: range.startColumn
  })
  if (!scrolledVisiblePosition) return
  props.hoverPreview.tryToPreventHideDocument()
  hoverPreviewState.visible = true
  hoverPreviewState.range = { ...range }
  const top = containerRect.top + scrolledVisiblePosition.top + scrolledVisiblePosition.height
  const left = containerRect.left + scrolledVisiblePosition.left
  hoverPreviewState.style.top = `${top}px`
  hoverPreviewState.style.left = `${left}px`
})
</script>
<template>
  <slot></slot>
  <teleport to="body">
    <div class="hover-preview-wrapper">
      <transition>
        <DocumentPreview
          v-show="hoverPreviewState.visible"
          :style="hoverPreviewState.style"
          :content="hoverPreviewState.content"
          :more-actions="hoverPreviewState.moreActions"
          :recommend-action="hoverPreviewState.recommendAction"
          class="hover-document"
          @mouseleave="hoverPreview.hideDocument()"
          @mouseenter="hoverPreview.tryToPreventHideDocument()"
        ></DocumentPreview>
      </transition>
    </div>
  </teleport>
</template>

<style lang="scss" scoped>
.hover-preview-wrapper {
  position: fixed;
  inset: 0;
  width: 0;
  height: 0;
}

.hover-document {
  position: absolute;
  transform-origin: left top;

  &.v-enter-active,
  &.v-leave-active {
    transition: 0.15s cubic-bezier(0, 1.25, 1, 1);
  }

  &.v-enter-from,
  &.v-leave-to {
    opacity: 0;
    transform: scale(0.8) translateY(20px);
  }
}
</style>
