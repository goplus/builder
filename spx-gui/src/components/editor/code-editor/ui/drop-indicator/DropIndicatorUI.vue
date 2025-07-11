<script setup lang="ts">
import { useDecorations } from '../common'
import { type DropIndicatorController } from '.'

const props = defineProps<{
  controller: DropIndicatorController
}>()

useDecorations(() => {
  const dropPosition = props.controller.dropPosition
  if (dropPosition == null) return []

  const { line, column } = dropPosition
  return [
    {
      range: {
        startLineNumber: line,
        startColumn: 0,
        endLineNumber: line,
        endColumn: 0
      },
      options: {
        isWholeLine: true,
        className: 'code-editor-drop-indicator-line',
        linesDecorationsClassName: 'code-editor-drop-indicator-line-header'
      }
    },
    {
      range: {
        startLineNumber: line,
        startColumn: column,
        endLineNumber: line,
        endColumn: column
      },
      options: {
        isWholeLine: false,
        className: 'code-editor-drop-indicator-insertion-point'
      }
    }
  ]
})
</script>

<template>
  <div></div>
</template>

<style lang="scss">
.code-editor-drop-indicator-line,
.code-editor-drop-indicator-line-header {
  background-color: var(--ui-color-grey-300);
}

.code-editor-drop-indicator-line {
  z-index: -1; // Keep it under the indent line
}

.code-editor-drop-indicator-line-header {
  width: 100% !important;
  left: 0 !important;
}

.code-editor-drop-indicator-insertion-point {
  position: relative;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    width: 2px;
    height: 100%;
    background-color: #000;
  }
}
</style>
