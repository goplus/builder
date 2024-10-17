<template>
  <UICard class="editor-preview">
    <UICardHeader>
      <div class="header">
        {{ $t({ en: 'Preview', zh: '预览' }) }}
      </div>
      <UIButton class="run-button" type="primary" icon="play" @click="show = true">
        {{ $t({ en: 'Run', zh: '运行' }) }}
      </UIButton>
    </UICardHeader>

    <UIFullScreenModal v-model:show="show" class="project-runner-modal">
      <RunnerContainer :project="editorCtx.project" @close="show = false" />
    </UIFullScreenModal>
    <div class="stage-viewer-container">
      <StageViewer />
    </div>
  </UICard>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import { UICard, UICardHeader, UIButton, UIFullScreenModal } from '@/components/ui'
import StageViewer from './stage-viewer/StageViewer.vue'
import RunnerContainer from '@/components/project/runner/RunnerContainer.vue'

let show = ref(false)

const editorCtx = useEditorCtx()
</script>

<style scoped lang="scss">
.editor-preview {
  height: 419px;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;

  .header {
    flex: 1;
    color: var(--ui-color-title);
  }

  .stage-viewer-container {
    display: flex;
    overflow: hidden;
    justify-content: center;
    padding: 12px;
    height: 100%;
  }
}

.project-runner-modal {
  margin-left: 32px;
  margin-right: 32px;
  height: 80vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #fff;
  border-radius: 20px;
  .n-modal-content {
    border-radius: 20px;
  }
  padding: 16px;
}
</style>
