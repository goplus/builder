<script setup lang="ts">
import CodeEditor from './CodeEditor.vue'
import { EditorUI } from '@/components/editor/code-editor/EditorUI'
import { Compiler } from '@/components/editor/code-editor/models/compiler'
import { Project } from '@/models/project'
import { Runtime } from '@/components/editor/code-editor/models/runtime'
import { DocAbility } from '@/components/editor/code-editor/models/document'
import { AIChat } from '@/components/editor/code-editor/models/ai-chat'
import { Coordinator } from '@/components/editor/code-editor/coordinators'
import { ref } from 'vue'

defineEmits<{
  'update:value': [value: string]
}>()

withDefaults(
  defineProps<{
    loading?: boolean
    value: string
  }>(),
  {
    loading: false
  }
)

const codeEditorUI = ref<InstanceType<typeof CodeEditor>>()

const { editorUI } = initCoordinator()

function initCoordinator() {
  const editorUI = new EditorUI()
  const compiler = new Compiler()
  const project = new Project()
  const runtime = new Runtime()
  const docAbility = new DocAbility()
  const aiChat = new AIChat()

  const coordinator = new Coordinator(editorUI, {
    compiler,
    project,
    runtime,
    docAbility,
    aiChat
  })
  return { coordinator, compiler, project, runtime, docAbility, aiChat, editorUI }
}

defineExpose({
  async format() {
    await codeEditorUI.value?.format()
  },
  editorUI
})
</script>

<template>
  <CodeEditor
    ref="codeEditorUI"
    :loading="loading"
    :value="value"
    :ui="editorUI"
    @update:value="$emit('update:value', $event)"
  ></CodeEditor>
</template>
