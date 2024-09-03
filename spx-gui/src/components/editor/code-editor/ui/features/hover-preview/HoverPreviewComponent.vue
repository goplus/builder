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

  const mouseColumn = e.position.column
  const mouseLineNumber = e.position.lineNumber

  const position = props.hoverPreview.editor.getModel()?.getWordAtPosition({
    column: e.range.startColumn,
    lineNumber: e.range.startLineNumber
  })
  if (!position || !position.word) return props.hoverPreview.hideDocument(true)

  const { startColumn, endColumn } = position
  const lineNumber = e.position.lineNumber
  // check if the word or mouse position is outside the allowed range
  if (
    // word is outside the range on the start or end line
    (lineNumber === hoverPreviewState.range.startLineNumber &&
      endColumn <= hoverPreviewState.range.startColumn) ||
    (lineNumber === hoverPreviewState.range.endLineNumber &&
      startColumn >= hoverPreviewState.range.endColumn) ||
    // word or mouse is on a line outside the allowed range
    lineNumber < hoverPreviewState.range.startLineNumber ||
    lineNumber > hoverPreviewState.range.endLineNumber ||
    mouseLineNumber < hoverPreviewState.range.startLineNumber ||
    mouseLineNumber > hoverPreviewState.range.endLineNumber ||
    // mouse is outside the column range on the start or end line
    (mouseLineNumber === hoverPreviewState.range.startLineNumber &&
      mouseColumn < hoverPreviewState.range.startColumn) ||
    (mouseLineNumber === hoverPreviewState.range.endLineNumber &&
      mouseColumn > hoverPreviewState.range.endColumn)
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
  hoverPreviewState.position.top =
    // here add `scrolledVisiblePosition.height` to make docPreview show under current code line
    containerRect.top + scrolledVisiblePosition.top + scrolledVisiblePosition.height
  hoverPreviewState.position.left = containerRect.left + scrolledVisiblePosition.left
})
</script>
<template>
  <slot></slot>
  <teleport to="body">
    <div class="hover-preview-wrapper">
      <transition>
        <!--  TODO: here need to redesign UI to satisfy collapse mode  -->
        <article
          v-show="hoverPreviewState.visible"
          class="hover-preview-container"
          style="position: absolute"
          :style="{
            top: hoverPreviewState.position.top + 'px',
            left: hoverPreviewState.position.left + 'px'
          }"
          @mouseleave="hoverPreview.hideDocument()"
          @mouseenter="hoverPreview.tryToPreventHideDocument()"
        >
          <DocumentPreview
            v-for="(doc, i) in hoverPreviewState.docs"
            :key="i"
            class="hover-document"
            :content="doc.content"
            :more-actions="doc.moreActions"
            :recommend-action="doc.recommendAction"
          ></DocumentPreview>
        </article>
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

.hover-preview-container {
  position: absolute;
  transform-origin: top left;

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

.hover-document + .hover-document {
  margin-top: 4px;
}
</style>
