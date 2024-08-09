<script setup lang="ts">
import CodeEditorUI from './ui/CodeEditorUI.vue'
import { EditorUI } from '@/components/editor/code-editor/EditorUI'
import { Compiler } from '@/components/editor/code-editor/compiler'
import { Project } from '@/models/project'
import { Runtime } from '@/components/editor/code-editor/runtime'
import { DocAbility } from '@/components/editor/code-editor/document'
import { ChatBot } from '@/components/editor/code-editor/chat-bot'
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

const codeEditorUI = ref<InstanceType<typeof CodeEditorUI>>()

const { editorUI } = initCoordinator()

function initCoordinator() {
  const editorUI = new EditorUI()
  const compiler = new Compiler()
  const project = new Project()
  const runtime = new Runtime()
  const docAbility = new DocAbility()
  const chatBot = new ChatBot()

  const coordinator = new Coordinator(editorUI, {
    compiler,
    project,
    runtime,
    docAbility,
    chatBot
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
  <CodeEditorUI
    ref="codeEditorUI"
    :loading="loading"
    :value="value"
    :ui="editorUI"
    @update:value="$emit('update:value', $event)"
  ></CodeEditorUI>
</template>
