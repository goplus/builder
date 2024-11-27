<script lang="ts">
export type CodeEditorCtx = {
  ui: CodeEditorUI
}
const codeEditorCtxInjectionKey: InjectionKey<CodeEditorCtx> = Symbol('code-editor-ctx')
export function useCodeEditorCtx() {
  const ctx = inject(codeEditorCtxInjectionKey)
  if (ctx == null) throw new Error('useCodeEditorCtx should be called inside of CodeEditorUI')
  return ctx
}
</script>

<script setup lang="ts">
import { type InjectionKey, inject, provide } from 'vue'
import { computedShallowReactive, useComputedDisposable } from '@/utils/utils'
import type { Project } from '@/models/project'
import { type ICodeEditorUI, CodeEditorUI } from '.'
import MonacoEditor, { type Editor, type Monaco } from './MonacoEditor.vue'
import APIReference from './api-reference/APIReferenceUI.vue'
import HoverUI from './hover/HoverUI.vue'
import CompletionUI from './completion/CompletionUI.vue'

const props = defineProps<{
  project: Project
}>()

const emit = defineEmits<{
  init: [ui: ICodeEditorUI]
}>()

const uiRef = useComputedDisposable(() => new CodeEditorUI(props.project))

function handleMonacoEditorInit(monaco: Monaco, editor: Editor) {
  uiRef.value.init(monaco, editor)
  emit('init', uiRef.value)
}

const codeEditorCtx = computedShallowReactive<CodeEditorCtx>(() => ({
  ui: uiRef.value
}))
provide(codeEditorCtxInjectionKey, codeEditorCtx)
</script>

<template>
  <div class="code-editor">
    <APIReference class="api-reference" :controller="uiRef.apiReferenceController" />
    <MonacoEditor :key="uiRef.id" class="monaco-editor" @init="handleMonacoEditorInit" />
    <HoverUI :controller="uiRef.hoverController" />
    <CompletionUI :controller="uiRef.completionController" />
  </div>
</template>

<style lang="scss" scoped>
.code-editor {
  position: relative;
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  justify-content: stretch;
}

.api-reference {
  flex: 0 0 160px;
}

.monaco-editor {
  flex: 1 1 0;
}
</style>
