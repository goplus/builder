<!--
 * @Author: Zhang zhiyang
 * @Date: 2024-01-15 14:56:59
 * @LastEditors: xuning 453594138@qq.com
 * @LastEditTime: 2024-03-11 18:41:30
 * @FilePath: \spx-gui\src\components\spx-stage\SpxStage.vue
 * @Description:
-->
<template>
  <UIPanel class="spx-stage">
    <div class="header">
      <div class="stage-button">
        {{
          $t({
            en: 'Stage',
            zh: '舞台'
          })
        }}
      </div>
      <n-button class="run-button" type="success" @click="show = true">{{
        $t({
          en: 'Run',
          zh: '运行'
        })
      }}</n-button>
    </div>
    <n-modal v-model:show="show" class="project-runner-modal">
      <RunnerContainer :project="project" @close="show = false" />
    </n-modal>
    <div ref="stageViewerContainer" class="stage-viewer-container">
      <!-- When the mount is not complete, use the default value to prevent errors during component initialization -->
      <StageViewer
        :width="containerWidth || 400"
        :height="containerHeight || 400"
        :selected-sprite-names="selectedSpriteNames"
        :project="project"
        @on-selected-sprites-change="onSelectedSpritesChange"
      ></StageViewer>
    </div>
  </UIPanel>
</template>

<script lang="ts" setup>
import { ref, watch, computed } from 'vue'
import { UIPanel } from '@/components/ui'
import { useSize } from '@/utils/dom'
import { NButton, NModal } from 'naive-ui'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import StageViewer from './stage-viewer'
import type { SelectedSpritesChangeEvent } from './stage-viewer'
import RunnerContainer from './RunnerContainer.vue'

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
.spx-stage {
  height: 40vh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;

  .header {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
  }

  .stage-button {
    background: rgba(90, 196, 236, 0.4);
    width: 80px;
    height: auto;
    text-align: center;
    font-size: 18px;
    border: 2px solid #00142970;
    border-radius: 0 0 10px 10px;
    z-index: 2;
  }

  .run-button {
    width: auto;
    border: 2px solid #00142970;
    border-radius: 16px;
    z-index: 100;
  }

  .show {
    flex: 1;
    text-align: center;
  }

  .center {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .stage-viewer-container {
    display: flex;
    justify-content: center;
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
