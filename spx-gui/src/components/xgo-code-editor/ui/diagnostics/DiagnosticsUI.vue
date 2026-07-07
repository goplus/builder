<script setup lang="ts">
import { computed, onUnmounted, shallowRef, watchEffect } from 'vue'
import { DiagnosticSeverity, type Diagnostic } from '../../common'
import type { monaco } from '../../monaco'
import { containsPosition } from '../../common'
import { builtInCommandCopilotFixProblem } from '../code-editor-ui'
import { fromMonacoPosition, toAbsolutePosition } from '../common'
import CommandIcon from '../command/CommandIcon.vue'
import type { DiagnosticsController } from '.'

const props = defineProps<{
  controller: DiagnosticsController
}>()

const hoveredDiagnostic = shallowRef<Diagnostic | null>(null)
let decorationCollection: monaco.editor.IEditorDecorationsCollection | null = null

function getDiagnosticCls(severity: DiagnosticSeverity, suffix?: string) {
  return ['code-editor-diagnostic', severity, suffix].filter(Boolean).join('-')
}

function getDiagnosticAtPosition(position: monaco.IPosition) {
  const diagnostics = props.controller.diagnostics
  if (diagnostics == null) return null
  const codePosition = fromMonacoPosition(position)
  return diagnostics.find((diagnostic) => containsPosition(diagnostic.range, codePosition)) ?? null
}

function handleMouseMove(target: monaco.editor.IMouseTarget) {
  const ui = props.controller.ui
  if (target.type !== ui.monaco.editor.MouseTargetType.CONTENT_TEXT || target.position == null) return
  hoveredDiagnostic.value = getDiagnosticAtPosition(target.position)
}

function handleFixProblem() {
  const ui = props.controller.ui
  const diagnostic = hoveredDiagnostic.value
  const textDocument = ui.activeTextDocument
  if (diagnostic == null || textDocument == null) return
  void ui.executeCommand(builtInCommandCopilotFixProblem, {
    textDocument: textDocument.id,
    problem: diagnostic
  })
}

const diagnosticCopilotStyle = computed(() => {
  const ui = props.controller.ui
  const diagnostic = hoveredDiagnostic.value
  if (diagnostic == null || !ui.isEditorInitialized) return null
  const position = toAbsolutePosition(diagnostic.range.end, ui.editor)
  if (position == null) return null
  return {
    top: `${position.top + position.height / 2}px`,
    left: `${position.left + 8}px`
  }
})

watchEffect((onCleanup) => {
  const ui = props.controller.ui
  if (!ui.isEditorInitialized) return
  const mouseMoveDisposable = ui.editor.onMouseMove((event) => handleMouseMove(event.target))
  onCleanup(() => mouseMoveDisposable.dispose())
})

function getDecorations() {
  const diagnostics = props.controller.diagnostics
  if (diagnostics == null) return []

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
  }
  return [...inlineDecorations, ...lineDecorations]
}

watchEffect(() => {
  const ui = props.controller.ui
  if (!ui.isEditorInitialized) return
  const decorations = getDecorations()
  decorationCollection = decorationCollection ?? ui.editor.createDecorationsCollection([])
  decorationCollection.set(decorations)
})

onUnmounted(() => {
  decorationCollection?.clear()
})
</script>

<template>
  <button
    v-if="hoveredDiagnostic != null && diagnosticCopilotStyle != null"
    class="code-editor-diagnostic-copilot"
    :style="diagnosticCopilotStyle"
    :aria-label="$t({ en: 'Ask Copilot to fix this problem', zh: '请 Copilot 修复这个问题' })"
    @click="handleFixProblem"
  >
    <CommandIcon type="copilot" />
  </button>
</template>

<style>
.code-editor-diagnostic-copilot {
  position: fixed;
  z-index: 20;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid var(--ui-color-grey-400);
  border-radius: 999px;
  background: var(--ui-color-grey-100);
  color: var(--ui-color-primary-600);
  box-shadow: var(--ui-box-shadow-md);
  cursor: pointer;
  transform: translateY(-50%);
}

.code-editor-diagnostic-copilot:hover {
  background: var(--ui-color-primary-100);
}

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
