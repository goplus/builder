<script setup lang="ts">
import { onUnmounted } from 'vue'
import type { Project } from '@/models/project'
import { type ICodeEditorUI, CodeEditorUI } from '.'
import MonacoEditor, { type Editor, type Monaco } from './MonacoEditor.vue'
import APIReference from './APIReference.vue'

const props = defineProps<{
  project: Project
}>()

const emit = defineEmits<{
  initialize: [ui: ICodeEditorUI]
}>()

const ui = new CodeEditorUI(props.project)

const ctrl = new AbortController()
onUnmounted(() => {
  ctrl.abort()
})

function handleMonaco(monaco: Monaco) {
  ui.initMonaco(monaco)
}

function handleEditor(editor: Editor) {
  ui.initEditor(editor)
  emit('initialize', ui)
  ui.init(ctrl.signal)
}

onUnmounted(() => {
  ui.dispose()
})
</script>

<template>
  <div class="code-editor">
    <APIReference class="api-reference" :api-reference="ui.apiReference" />
    <MonacoEditor class="monaco-editor" @monaco="handleMonaco" @editor="handleEditor" />
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
