<script setup lang="ts">
import { onUnmounted } from 'vue'
import type { Project } from '@/models/project'
import { type ICodeEditorUI, CodeEditorUI } from '.'
import MonacoEditor, { type Editor, type Monaco } from './MonacoEditor.vue'

const props = defineProps<{
  project: Project
}>()

const emit = defineEmits<{
  initialize: [ui: ICodeEditorUI]
}>()

const ui = new CodeEditorUI(props.project)

function handleMonaco(monaco: Monaco) {
  ui.initializeMonaco(monaco)
}

function handleEditor(editor: Editor) {
  ui.initializeEditor(editor)
  emit('initialize', ui)
  ui.initialize()
}

onUnmounted(() => {
  ui.dispose()
})
</script>

<template>
  <div class="code-editor">
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

.monaco-editor {
  flex: 1 1 0;
}
</style>
