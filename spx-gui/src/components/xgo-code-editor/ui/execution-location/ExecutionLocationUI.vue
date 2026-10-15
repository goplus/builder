<script setup lang="ts">
import { shallowRef, watch } from 'vue'
import type { ExecutionLocation } from '../../execution-location'
import { useCodeEditorUICtx } from '../CodeEditorUI.vue'
import { useDecorations } from '../common'

const { ui } = useCodeEditorUICtx()
const locations = shallowRef<readonly ExecutionLocation[]>([])

watch(
  () => ui.codeEditor.executionLocationProvider,
  (provider, _, onCleanup) => {
    const refreshLocation = () => {
      locations.value = provider?.provideExecutionLocations() ?? []
    }
    refreshLocation()
    if (provider != null) onCleanup(provider.on('didChangeExecutionLocations', refreshLocation))
  },
  { immediate: true }
)

useDecorations(() => {
  const lines = new Set(
    locations.value
      .filter((location) => location.textDocument.uri === ui.activeTextDocument?.id.uri)
      .map((location) => location.line)
  )
  if (lines.size === 0) return []
  const model = ui.editor.getModel()
  if (model == null) return []
  return [...lines]
    .filter((line) => line >= 1 && line <= model.getLineCount())
    .map((line) => ({
      range: { startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: 1 },
      options: {
        isWholeLine: true,
        className: 'code-editor-execution-location',
        linesDecorationsClassName: 'code-editor-execution-location-header'
      }
    }))
})
</script>

<template><div></div></template>

<style>
.code-editor-execution-location {
  background-color: rgba(255, 193, 7, 0.24);
}
.code-editor-execution-location-header {
  width: 3px !important;
  margin-left: 2px;
  background-color: rgba(245, 158, 11, 0.9);
}
</style>
