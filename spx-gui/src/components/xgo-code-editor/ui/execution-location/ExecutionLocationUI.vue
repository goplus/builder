<script setup lang="ts">
import { useCodeEditorUICtx } from '../CodeEditorUI.vue'
import { useDecorations } from '../common'

const { ui } = useCodeEditorUICtx()

useDecorations(() => {
  const location = ui.codeEditor.executionLocationProvider?.location
  const line = location?.textDocument.uri === ui.activeTextDocument?.id.uri ? location?.line : null
  if (line == null) return []
  const model = ui.editor.getModel()
  if (model == null || line < 1 || line > model.getLineCount()) return []
  return [
    {
      range: { startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: 1 },
      options: {
        isWholeLine: true,
        className: 'code-editor-execution-location',
        linesDecorationsClassName: 'code-editor-execution-location-header'
      }
    }
  ]
})
</script>

<template><div></div></template>

<style>
.code-editor-execution-location {
  background-color: rgba(40, 190, 170, 0.18);
}
.code-editor-execution-location-header {
  width: 100% !important;
  left: 0 !important;
  background-color: var(--ui-color-turquoise-500);
}
</style>
