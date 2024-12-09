<script setup lang="ts">
import { watchEffect } from 'vue'
import { DiagnosticSeverity } from '../../common'
import type { monaco } from '../common'
import { useCodeEditorCtx } from '../CodeEditorUI.vue'
import type { DiagnosticsController } from '.'

const props = defineProps<{
  controller: DiagnosticsController
}>()

const codeEditorCtx = useCodeEditorCtx()

let dc: monaco.editor.IEditorDecorationsCollection | null = null
function getDecorationsCollection() {
  if (dc == null) dc = codeEditorCtx.ui.editor.createDecorationsCollection([])
  return dc
}

function getDiagnosticCls(severity: DiagnosticSeverity, suffix?: string) {
  const name = {
    [DiagnosticSeverity.Error]: 'error',
    [DiagnosticSeverity.Warning]: 'warning'
  }[severity]
  return ['code-editor-diagnostic', name, suffix].filter(Boolean).join('-')
}

watchEffect((onCleanUp) => {
  const diagnostics = props.controller.diagnostics
  if (diagnostics == null) return

  const decorations: monaco.editor.IModelDeltaDecoration[] = []
  for (const diagnostic of diagnostics) {
    decorations.push({
      range: {
        startLineNumber: diagnostic.range.start.line,
        startColumn: diagnostic.range.start.column,
        endLineNumber: diagnostic.range.end.line,
        endColumn: diagnostic.range.end.column
      },
      options: {
        isWholeLine: false,
        inlineClassName: getDiagnosticCls(diagnostic.severity)
      }
    })
    decorations.push({
      range: {
        startLineNumber: diagnostic.range.start.line,
        startColumn: diagnostic.range.start.column,
        endLineNumber: diagnostic.range.end.line,
        endColumn: diagnostic.range.end.column
      },
      options: {
        isWholeLine: true,
        className: getDiagnosticCls(diagnostic.severity, 'line-body'),
        linesDecorationsClassName: getDiagnosticCls(diagnostic.severity, 'line-header')
      }
    })
  }

  const decorationsCollection = getDecorationsCollection()
  decorationsCollection.append(decorations)
  onCleanUp(() => decorationsCollection.clear())
})
</script>

<template>
  <div></div>
</template>

<style lang="scss">
.code-editor-diagnostic-error-line-header,
.code-editor-diagnostic-warning-line-header {
  width: 100% !important;
  left: 0 !important;
}

.code-editor-diagnostic-error {
  text-decoration: underline wavy var(--ui-color-red-300);
}
.code-editor-diagnostic-error-line-body {
  background-color: rgba(255, 70, 70, 0.1);
}
.code-editor-diagnostic-error-line-header {
  background-color: rgba(255, 70, 70, 0.25);
}

.code-editor-diagnostic-warning {
  text-decoration: underline wavy var(--ui-color-yellow-600);
}
.code-editor-diagnostic-warning-line-body {
  background-color: rgba(255, 153, 0, 0.1);
}
.code-editor-diagnostic-warning-line-header {
  background-color: rgba(255, 153, 0, 0.25);
}
</style>
