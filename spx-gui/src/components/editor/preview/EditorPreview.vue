<template>
  <UICard class="editor-preview">
    <UICardHeader>
      <div class="header">
        {{ $t({ en: 'Preview', zh: '预览' }) }}
      </div>
      <UIButton ref="runButtonRef" class="run-button" type="primary" icon="play" @click="running = true">
        {{ $t({ en: 'Run', zh: '运行' }) }}
      </UIButton>
    </UICardHeader>

    <!--
      naive-ui Modal does not support feature like `destroyOnClose: false` of antd Modal.
      To initialize the runner early & only once, we use a hidden container to hold the runner.
      TODO: use `UIModal` with `destroyOnClose: false` feature.
    -->
    <div class="project-runner-modal" :class="{ visible: running }" :style="modalStyle">
      <RunnerContainer :project="editorCtx.project" :visible="running" @close="running = false" />
    </div>
    <div class="stage-viewer-container">
      <StageViewer />
    </div>
  </UICard>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import { UICard, UICardHeader, UIButton } from '@/components/ui'
import StageViewer from './stage-viewer/StageViewer.vue'
import RunnerContainer from './RunnerContainer.vue'

const running = ref(false)
const editorCtx = useEditorCtx()

const runButtonRef = ref<InstanceType<typeof UIButton>>()
const modalStyle = computed(() => {
  if (!runButtonRef.value) return null
  const { top, left, width, height } = runButtonRef.value.$el.getBoundingClientRect()
  return { transformOrigin: `${left + width / 2}px ${top + height / 2}px` }
})
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
  position: fixed;
  z-index: 100;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background-color: white;
  transform: scale(0);
  opacity: 0;
  transition:
    transform 0.5s ease-in-out,
    opacity 0.2s ease-in-out 0.2s;

  &.visible {
    display: block;
    transform: scale(1);
    opacity: 1;
  }
}
</style>
