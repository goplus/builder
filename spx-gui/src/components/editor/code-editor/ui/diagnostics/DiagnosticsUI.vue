<script setup lang="ts">
import { watchEffect } from 'vue'
import { DiagnosticSeverity, type Diagnostic } from '../../common'
import type { monaco } from '../../monaco'
import { useCodeEditorUICtx } from '../CodeEditorUI.vue'
import type { DiagnosticsController } from '.'

const props = defineProps<{
  controller: DiagnosticsController
}>()

const codeEditorCtx = useCodeEditorUICtx()

let dc: monaco.editor.IEditorDecorationsCollection | null = null
function getDecorationsCollection() {
  if (dc == null) dc = codeEditorCtx.ui.editor.createDecorationsCollection([])
  return dc
}

function getDiagnosticCls(severity: DiagnosticSeverity, suffix?: string) {
  return ['code-editor-diagnostic', severity, suffix].filter(Boolean).join('-')
}

watchEffect((onCleanUp) => {
  const diagnostics = props.controller.diagnostics
  if (diagnostics == null) return

  const inlineDecorations: monaco.editor.IModelDeltaDecoration[] = []
  for (const diagnostic of diagnostics) {
    inlineDecorations.push({
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
  }
  const byLine: Map<number, Diagnostic> = new Map()
  for (const diagnostic of diagnostics) {
    for (let l = diagnostic.range.start.line; l <= diagnostic.range.end.line; l++) {
      // deduplicate diagnostics by line
      const existed = byLine.get(l)
      if (
        existed == null ||
        (existed.severity === DiagnosticSeverity.Warning && diagnostic.severity === DiagnosticSeverity.Error)
      ) {
        byLine.set(l, diagnostic)
      }
    }
  }
  const lineDecorations: monaco.editor.IModelDeltaDecoration[] = []
  for (const [line, diagnostic] of byLine.entries()) {
    lineDecorations.push({
      range: {
        startLineNumber: line,
        startColumn: 0,
        endLineNumber: line,
        endColumn: 0
      },
      options: {
        isWholeLine: true,
        className: getDiagnosticCls(diagnostic.severity, 'line-body'),
        linesDecorationsClassName: getDiagnosticCls(diagnostic.severity, 'line-header')
      }
    })
    // TODO: append message to the line end
  }

  const decorationsCollection = getDecorationsCollection()
  decorationsCollection.append(inlineDecorations)
  decorationsCollection.append(lineDecorations)
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
  text-decoration: underline wavy var(--ui-color-red-600);
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
