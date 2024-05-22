<template>
  <div ref="conatiner" class="stage-viewer">
    <v-stage
      v-if="stageConfig != null && !backdropLoading"
      ref="stageRef"
      :config="stageConfig"
      @mousedown="handleStageMousedown"
      @contextmenu="handleContextMenu"
    >
      <v-layer>
        <v-image v-if="backdropImg != null" :config="{ ...mapSize, image: backdropImg }"></v-image>
      </v-layer>
      <v-layer>
        <SpriteItem
          v-for="sprite in visibleSprites"
          :key="sprite.name"
          :sprite="sprite"
          :map-size="mapSize!"
          :sprites-ready-map="spritesReadyMap"
        />
      </v-layer>
      <v-layer>
        <SpriteTransformer :sprites-ready="(sprite) => !!spritesReadyMap.get(sprite.name)" />
      </v-layer>
    </v-stage>
    <UIDropdown trigger="manual" :visible="menuVisible" :pos="menuPos" placement="bottom-start">
      <UIMenu>
        <UIMenuItem @click="moveSprite('up')">{{
          $t({ en: 'Bring forward', zh: '向前移动' })
        }}</UIMenuItem>
        <UIMenuItem @click="moveSprite('top')">{{
          $t({ en: 'Bring to front', zh: '移到最前' })
        }}</UIMenuItem>
        <UIMenuItem @click="moveSprite('down')">{{
          $t({ en: 'Send backward', zh: '向后移动' })
        }}</UIMenuItem>
        <UIMenuItem @click="moveSprite('bottom')">{{
          $t({ en: 'Send to back', zh: '移到最后' })
        }}</UIMenuItem>
      </UIMenu>
    </UIDropdown>
    <UILoading :visible="spritesAndBackdropLoading" cover />
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { Stage } from 'konva/lib/Stage'
import { UIDropdown, UILoading, UIMenu, UIMenuItem } from '@/components/ui'
import { useContentSize } from '@/utils/dom'
import { useAsyncComputed } from '@/utils/utils'
import type { Sprite } from '@/models/sprite'
import { useImgFile } from '@/utils/file'
import { useEditorCtx } from '../../EditorContextProvider.vue'
import SpriteTransformer from './SpriteTransformer.vue'
import SpriteItem from './SpriteItem.vue'

const editorCtx = useEditorCtx()
const conatiner = ref<HTMLElement | null>(null)
const containerSize = useContentSize(conatiner)

const stageRef = ref<any>()
const mapSize = useAsyncComputed(() => editorCtx.project.stage.getMapSize())

const spritesReadyMap = reactive(new Map<string, boolean>())

/** containerSize / mapSize */
const scale = computed(() => {
  if (containerSize.width.value == null || containerSize.height.value == null) return null
  if (mapSize.value == null) return null
  const widthScale = containerSize.width.value / mapSize.value.width
  const heightScale = containerSize.height.value / mapSize.value.height
  return Math.min(widthScale, heightScale)
})

const stageConfig = computed(() => {
  if (scale.value == null) return null
  if (mapSize.value == null) return null
  const width = mapSize.value.width * scale.value
  const height = mapSize.value.height * scale.value
  return {
    width,
    height,
    scale: {
      x: scale.value,
      y: scale.value
    }
  }
})

const [backdropImg, backdropLoading] = useImgFile(
  () => editorCtx.project.stage.defaultBackdrop?.img
)

const spritesAndBackdropLoading = computed(() => {
  if (backdropLoading.value) return true
  return editorCtx.project.sprites.some((s) => !spritesReadyMap.get(s.name))
})

const visibleSprites = computed(() => {
  const { zorder, sprites } = editorCtx.project
  return zorder.map((name) => sprites.find((s) => s.name === name)).filter(Boolean) as Sprite[]
})

const menuVisible = ref(false)
const menuPos = ref({ x: 0, y: 0 })

function handleContextMenu(e: KonvaEventObject<MouseEvent>) {
  e.evt.preventDefault()
  if (stageRef.value == null || e.target.parent == null) return
  const stage: Stage = stageRef.value.getStage()
  const pointerPos = stage.getPointerPosition()
  if (pointerPos == null) return
  const stagePos = stage.getContent().getBoundingClientRect()
  const offsetY = -8 // offset for dropdown menu
  menuPos.value = {
    x: stagePos.x + pointerPos.x,
    y: stagePos.y + pointerPos.y + offsetY
  }
  menuVisible.value = true
}

function handleStageMousedown() {
  if (menuVisible.value) menuVisible.value = false
}

function moveSprite(direction: 'up' | 'down' | 'top' | 'bottom') {
  const project = editorCtx.project
  const selectedSprite = project.selectedSprite
  if (selectedSprite == null) return
  project.history.doAction(
    { en: 'moveSprite', zh: 'moveSprite' },
    () => {
      if (direction === 'up') {
        project.upSpriteZorder(selectedSprite.name)
      } else if (direction === 'down') {
        project.downSpriteZorder(selectedSprite.name)
      } else if (direction === 'top') {
        project.topSpriteZorder(selectedSprite.name)
      } else if (direction === 'bottom') {
        project.bottomSpriteZorder(selectedSprite.name)
      }
    }
  )
  menuVisible.value = false
}
</script>
<style scoped>
.stage-viewer {
  height: 100%;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;

  border-radius: var(--ui-border-radius-1);
  background-image: url(@/components/project/bg.svg);
  background-position: center;
  background-repeat: repeat;
  background-size: contain;
  position: relative;
}
</style>
