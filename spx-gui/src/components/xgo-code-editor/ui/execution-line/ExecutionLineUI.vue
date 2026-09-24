<script setup lang="ts">
import { useCodeEditorUICtx } from '../CodeEditorUI.vue'
import { useDecorations } from '../common'
import type { ExecutionLineController } from '.'

const props = defineProps<{ controller: ExecutionLineController }>()
const { ui } = useCodeEditorUICtx()

useDecorations(() => {
  const line = props.controller.position?.line
  if (line == null) return []
  const model = ui.editor.getModel()
  if (model == null || line < 1 || line > model.getLineCount()) return []
  return [
    {
      range: { startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: 1 },
      options: {
        isWholeLine: true,
        className: 'code-editor-execution-line',
        linesDecorationsClassName: 'code-editor-execution-line-header'
      }
    }
  ]
})
</script>

<template><div></div></template>

<style>
.code-editor-execution-line {
  background-color: rgba(40, 190, 170, 0.18);
}
.code-editor-execution-line-header {
  width: 100% !important;
  left: 0 !important;
  background-color: var(--ui-color-turquoise-500);
}
</style>
