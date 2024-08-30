<script setup lang="ts">
import CodeEditorUI from './ui/CodeEditorUI.vue'
import { EditorUI } from '@/components/editor/code-editor/EditorUI'
import { Compiler } from '@/components/editor/code-editor/compiler'
import { Project } from '@/models/project'
import { Runtime } from '@/components/editor/code-editor/runtime'
import { DocAbility } from '@/components/editor/code-editor/document'
import { ChatBot } from '@/components/editor/code-editor/chat-bot'
import { Coordinator } from '@/components/editor/code-editor/coordinators'
import { onUnmounted, ref } from 'vue'
import { useI18n } from '@/utils/i18n'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'

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

const i18n = useI18n()
const editorCtx = useEditorCtx()
const codeEditorUI = ref<InstanceType<typeof CodeEditorUI>>()
const { editorUI } = initCoordinator()

onUnmounted(() => {
  // for vite HMR, we have to dispose editorUI when HMR triggered
  editorUI.dispose()
})

function initCoordinator() {
  const editorUI = new EditorUI(i18n, () => editorCtx.project)
  const compiler = new Compiler()
  const project = new Project()
  const runtime = new Runtime()
  const docAbility = new DocAbility(i18n, () => editorCtx.project)
  const chatBot = new ChatBot(i18n)

  const coordinator = new Coordinator(editorUI, runtime, compiler, chatBot, docAbility, project)
  return { coordinator, compiler, project, runtime, docAbility, chatBot, editorUI }
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
