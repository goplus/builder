<!--
 * @Author: Zhang zhiyang
 * @Date: 2024-01-15 14:56:59
 * @LastEditors: xuning 453594138@qq.com
 * @LastEditTime: 2024-03-11 18:41:30
 * @FilePath: \spx-gui\src\components\spx-stage\SpxStage.vue
 * @Description:
-->
<template>
  <UICard class="spx-stage">
    <UICardHeader>
      <div class="stage-button">
        {{
          $t({
            en: 'Stage',
            zh: '舞台'
          })
        }}
      </div>
      <UIButton class="run-button" type="success" @click="show = true">{{
        $t({
          en: 'Run',
          zh: '运行'
        })
      }}</UIButton>
    </UICardHeader>
    <UIModal v-model:show="show" size="full" class="modal">
      <RunnerContainer :project="project" @close="show = false" />
    </UIModal>
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
  </UICard>
</template>

<script lang="ts" setup>
import { ref, watch, computed } from 'vue'
import { UICard } from '@/components/ui'
import { useSize } from '@/utils/dom'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import StageViewer from './stage-viewer'
import type { SelectedSpritesChangeEvent } from './stage-viewer'
import RunnerContainer from './RunnerContainer.vue'
import UIButton from '@/components/ui/UIButton.vue'
import { UICardHeader } from '@/components/ui'
import { UIModal } from '@/components/ui'

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

.stage-button {
  flex: 1;
}
</style>
