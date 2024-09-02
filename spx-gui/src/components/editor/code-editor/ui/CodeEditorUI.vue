<!-- eslint-disable vue/no-v-html -->
<template>
  <div class="code-editor">
    <EditorSidebar ref="editorSidebar" :ui="ui" @insert-text="handleUseSnippet"></EditorSidebar>
    <!--  this is core coding input area  -->
    <div class="code-text-editor-wrapper">
      <CodeTextEditor
        ref="codeTextEditor"
        :ui="ui"
        :value="value"
        @update:value="(v) => emit('update:value', v)"
      />
    </div>
    <!--  this area in coding content right side position in coding input area, current function is font zoom and sprite thumb preview  -->
    <div class="extra">
      <UIImg class="thumbnail" :src="thumbnailSrc" />
      <div class="zoomer">
        <button class="zoom-btn" title="Zoom in" @click="handleZoom('in')" v-html="iconZoomIn" />
        <button class="zoom-btn" title="Zoom out" @click="handleZoom('out')" v-html="iconZoomOut" />
        <button
          class="zoom-btn"
          title="Reset"
          @click="handleZoom('initial')"
          v-html="iconZoomReset"
        />
      </div>
    </div>
    <UILoading :visible="loading" cover />
    <ChatBotModal
      v-if="ui.chatBotModal.state.chat"
      :visible="ui.chatBotModal.state.visible"
      :chat="ui.chatBotModal.state.chat"
      @cancelled="ui.chatBotModal.setVisible(false)"
    ></ChatBotModal>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

import { UIImg, UILoading } from '@/components/ui'
import { useEditorCtx } from '../../EditorContextProvider.vue'
import { CodeTextEditor } from './code-text-editor'
import { useFileUrl } from '@/utils/file'

import iconZoomIn from './icons/zoom-in.svg?raw'
import iconZoomOut from './icons/zoom-out.svg?raw'
import iconZoomReset from './icons/zoom-reset.svg?raw'

import type { EditorUI } from '@/components/editor/code-editor/EditorUI'

import EditorSidebar from './EditorSidebar.vue'
import ChatBotModal from './features/chat-bot/ChatBotModalComponent.vue'

withDefaults(
  defineProps<{
    loading?: boolean
    ui: EditorUI
    value: string
  }>(),
  {
    loading: false
  }
)

const emit = defineEmits<{
  'update:value': [value: string]
}>()

const editorCtx = useEditorCtx()

const codeTextEditor = ref<InstanceType<typeof CodeTextEditor>>()

function handleZoom(action: 'in' | 'out' | 'initial') {
  codeTextEditor.value?.zoomFont(action)
}

const [thumbnailSrc] = useFileUrl(() => {
  const project = editorCtx.project
  if (project.selected?.type === 'stage') return project.stage.defaultBackdrop?.img
  if (project.selectedSprite) return project.selectedSprite.defaultCostume?.img
})

function handleUseSnippet(insertText: string) {
  codeTextEditor.value?.insertSnippet(insertText)
}

defineExpose({
  async format() {
    await codeTextEditor.value?.format()
  }
})
</script>

<style scoped lang="scss">
.code-text-editor-wrapper {
  flex: 5 1 300px;
  min-width: 0;
  padding: 12px;
}

.extra {
  padding: 12px;
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.thumbnail {
  flex: 0 0 auto;
  width: 60px;
  height: 60px;
  opacity: 0.3;
}

.zoomer {
  width: 60px;
  padding-bottom: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--ui-gap-middle);
}

.zoom-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  border-radius: 12px;
  color: var(--ui-color-text);
  background-color: var(--ui-color-grey-300);
  transition: background-color 0.2s;

  &:hover {
    background-color: var(--ui-color-grey-200);
  }
  &:active {
    background-color: var(--ui-color-grey-400);
  }
}
</style>
