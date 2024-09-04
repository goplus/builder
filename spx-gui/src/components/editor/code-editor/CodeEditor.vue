<script setup lang="ts">
import CodeEditorUI from './ui/CodeEditorUI.vue'
import { EditorUI } from '@/components/editor/code-editor/EditorUI'
import { Compiler } from '@/components/editor/code-editor/compiler'
import { Project } from '@/models/project'
import { Runtime } from '@/components/editor/code-editor/runtime'
import { DocAbility } from '@/components/editor/code-editor/document'
import { ChatBot } from '@/components/editor/code-editor/chat-bot'
import { Coordinator } from '@/components/editor/code-editor/coordinators'
import { onUnmounted, ref, watchEffect } from 'vue'
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
const { editorUI, compiler } = initCoordinator()
const wasmContainer = ref<HTMLIFrameElement>()

onUnmounted(() => {
  // for vite HMR, we have to dispose editorUI when HMR triggered
  editorUI.dispose()
})

watchEffect(() => {
  if (wasmContainer.value) compiler.setContainerElement(wasmContainer.value)
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
  <div class="code-editor">
    <CodeEditorUI
      ref="codeEditorUI"
      :loading="loading"
      :value="value"
      :ui="editorUI"
      @update:value="$emit('update:value', $event)"
    ></CodeEditorUI>
    <teleport to="body">
      <!-- load wasm in iframe allow auto reload when wasm error  -->
      <!-- set id for devtool better check, and hide iframe in viewport by css  -->
      <iframe
        id="wasmContainer"
        ref="wasmContainer"
        width="0"
        height="0"
        src="about:blank"
      ></iframe>
    </teleport>
  </div>
</template>

<style scoped lang="scss">
.code-editor {
  position: relative;
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  justify-content: stretch;
}

#wasmContainer {
  overflow: hidden;
  height: 0;
}
</style>
