<!--
 * @Author: Zhang zhiyang
 * @Date: 2024-01-15 14:56:59
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-03-04 15:06:54
 * @FilePath: \builder\spx-gui\src\components\spx-stage\SpxStage.vue
 * @Description: 
-->
<template>
  <div ref="spxStage" class="spx-stage">
    <div class="stage-button">{{ $t('component.stage') }}</div>
    <n-button type="success" class="stage-run-button" @click="run">{{ $t('stage.run') }}</n-button>
    <iframe v-if="show" src="/main.html" frameborder="0" class="show"></iframe>
    <div v-else class="stage-viewer-container">
      <!-- When the mount is not complete, use the default value to prevent errors during component initialization -->
      <StageViewer
        :width="containerWidth || 400"
        :height="containerHeight || 400"
        :selected-sprite-names="selectedSpriteNames"
        :project="projectStore.project as Project"
        @on-selected-sprites-change="onSelectedSpritesChange"
      ></StageViewer>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useSize } from '@/util/dom'
import { NButton } from 'naive-ui'
import { useProjectStore } from '@/store/modules/project'
import { useSpriteStore } from '@/store'
import { useBackdropStore } from '@/store/modules/backdrop'
import StageViewer from '@/components/stage-viewer'
import type { SelectedSpritesChangeEvent } from '@/components/stage-viewer'
import { Project } from '@/class/project'
import type { Sprite } from '@/class/sprite'

let show = ref(false)
const backdropStore = useBackdropStore()

const projectStore = useProjectStore()
const spriteStore = useSpriteStore()

const spxStage = ref<HTMLElement | null>(null)
const { width: containerWidth, height: containerHeight } = useSize(spxStage)

const selectedSpriteNames = ref<string[]>([])

const onSelectedSpritesChange = (e: SelectedSpritesChangeEvent) => {
  selectedSpriteNames.value = e.names
  spriteStore.current = spriteStore.list.find((sprite) => sprite.name === e.names[0]) as Sprite
}

watch(
  () => spriteStore.current,
  () => {
    if (spriteStore.current) {
      selectedSpriteNames.value = [spriteStore.current.name]
    } else {
      selectedSpriteNames.value = []
    }
  }
)

const run = async () => {
  console.log('run')
  show.value = false
  projectStore.project.run()
  // If you assign show to `true` directly in a block of code, it will result in the page view not being updated and the iframe will not be remounted, hence the 300ms delay!
  setTimeout(() => {
    show.value = true
  }, 300)
}
</script>

<style scoped lang="scss">
.spx-stage {
  height: 40vh;
  display: flex;
  flex-direction: column;
  border: 2px solid #00142970;
  position: relative;
  background: white;
  border-radius: 24px;
  margin: 10px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;

  .stage-button {
    background: rgba(90, 196, 236, 0.4);
    width: 80px;
    height: auto;
    text-align: center;
    position: absolute;
    top: -2px;
    left: 8px;
    font-size: 18px;
    border: 2px solid #00142970;
    border-radius: 0 0 10px 10px;
    z-index: 2;
  }

  .n-button {
    background: #3a8b3b;
    position: absolute;
    right: 6px;
    top: 2px;
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
</style>
