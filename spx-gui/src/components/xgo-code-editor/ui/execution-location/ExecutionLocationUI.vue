<script setup lang="ts">
import { shallowRef, watch } from 'vue'
import type { ExecutionLocation } from '../../execution-location'
import { useCodeEditorUICtx } from '../CodeEditorUI.vue'
import { useDecorations } from '../common'

const { ui } = useCodeEditorUICtx()
const location = shallowRef<ExecutionLocation | null>(null)

watch(
  () => ui.codeEditor.executionLocationProvider,
  (provider, _, onCleanup) => {
    const refreshLocation = () => {
      location.value = provider?.provideExecutionLocation() ?? null
    }
    refreshLocation()
    if (provider != null) onCleanup(provider.on('didChangeExecutionLocation', refreshLocation))
  },
  { immediate: true }
)

useDecorations(() => {
  const currentLocation = location.value
  const line =
    currentLocation != null && currentLocation.textDocument.uri === ui.activeTextDocument?.id.uri
      ? currentLocation.line
      : null
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
