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

    <n-modal v-model:show="show" class="project-runner-modal">
      <RunnerContainer :project="project" @close="show = false" />
    </n-modal>
    <div ref="stageViewerContainer" class="stage-viewer-container">
      <!-- When the mount is not complete, use the default value to prevent errors during component initialization -->
      <StageViewer
        class="stage-viewer"
        :width="containerWidth || 400"
        :height="containerHeight || 400"
        :selected-sprite-names="selectedSpriteNames"
        :project="project"
        @on-selected-sprites-change="onSelectedSpritesChange"
      ></StageViewer>
    </div>
  </UICard>
</template>

<script lang="ts" setup>
import { ref, watch, computed } from 'vue'
import { useSize } from '@/utils/dom'
import { NModal } from 'naive-ui'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import { UICard, UICardHeader, UIButton } from '@/components/ui'
import RunnerContainer from './RunnerContainer.vue'
import StageViewer from './stage-viewer'
import type { SelectedSpritesChangeEvent } from './stage-viewer'

let show = ref(false)

const editorCtx = useEditorCtx()

const project = computed(() => editorCtx.project)
const stageViewerContainer = ref<HTMLElement | null>(null)
const { width: containerWidth, height: containerHeight } = useSize(stageViewerContainer)

const selectedSpriteNames = ref<string[]>([])

const onSelectedSpritesChange = (e: SelectedSpritesChangeEvent) => {
  selectedSpriteNames.value = e.names
  editorCtx.select('sprite', e.names[0])
}

watch(
  () => editorCtx.selectedSprite,
  () => {
    if (editorCtx.selectedSprite) {
      selectedSpriteNames.value = [editorCtx.selectedSprite.name]
    } else {
      selectedSpriteNames.value = []
    }
  }
)
</script>

<style scoped lang="scss">
.editor-preview {
  height: 40vh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;

  .header {
    flex: 1;
  }

  .stage-viewer-container {
    display: flex;
    overflow: hidden;
    justify-content: center;
    padding: 1em;

    .stage-viewer {
      border-radius: var(--ui-border-radius-1);
      background: #f0f0f0;
    }
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
