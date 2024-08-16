<template>
  <div ref="conatiner" class="stage-viewer">
    <v-stage
      v-if="stageConfig != null"
      ref="stageRef"
      :config="stageConfig"
      @mousedown="handleStageMousedown"
      @contextmenu="handleContextMenu"
    >
      <v-layer>
        <v-rect v-if="konvaBackdropConfig" :config="konvaBackdropConfig"></v-rect>
      </v-layer>
      <v-layer>
        <SpriteNode
          v-for="sprite in visibleSprites"
          :key="sprite.name"
          :sprite="sprite"
          :map-size="mapSize!"
          :node-ready-map="nodeReadyMap"
        />
      </v-layer>
      <v-layer>
        <WidgetNode
          v-for="widget in visibleWidgets"
          :key="widget.name"
          :widget="widget"
          :map-size="mapSize!"
          :node-ready-map="nodeReadyMap"
        />
      </v-layer>
      <v-layer>
        <NodeTransformer :node-ready-map="nodeReadyMap" />
      </v-layer>
    </v-stage>
    <UIDropdown trigger="manual" :visible="menuVisible" :pos="menuPos" placement="bottom-start">
      <UIMenu>
        <UIMenuItem @click="moveZorder('up')">{{ $t(moveActionNames.up) }}</UIMenuItem>
        <UIMenuItem @click="moveZorder('top')">{{ $t(moveActionNames.top) }}</UIMenuItem>
        <UIMenuItem @click="moveZorder('down')">{{ $t(moveActionNames.down) }}</UIMenuItem>
        <UIMenuItem @click="moveZorder('bottom')">{{ $t(moveActionNames.bottom) }}</UIMenuItem>
      </UIMenu>
    </UIDropdown>
    <UILoading :visible="loading" cover />
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watchEffect } from 'vue'
import Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { Stage } from 'konva/lib/Stage'
import { UIDropdown, UILoading, UIMenu, UIMenuItem } from '@/components/ui'
import { useContentSize } from '@/utils/dom'
import { useFileUrl } from '@/utils/file'
import type { Sprite } from '@/models/sprite'
import { MapMode } from '@/models/stage'
import type { Widget } from '@/models/widget'
import { useEditorCtx } from '../../EditorContextProvider.vue'
import NodeTransformer from './NodeTransformer.vue'
import SpriteNode from './SpriteNode.vue'
import WidgetNode from './widgets/WidgetNode.vue'
import { getNodeName } from './node'

const editorCtx = useEditorCtx()
const conatiner = ref<HTMLElement | null>(null)
const containerSize = useContentSize(conatiner)

const stageRef = ref<{
  getStage(): Konva.Stage
}>()
const mapSize = computed(() => editorCtx.project.stage.getMapSize())

const nodeReadyMap = reactive(new Map<string, boolean>())

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

const backdropImg = ref<HTMLImageElement | null>(null)
const [backdropSrc, backdropSrcLoading] = useFileUrl(
  () => editorCtx.project.stage.defaultBackdrop?.img
)
watchEffect(() => {
  if (backdropSrc.value == null) return
  const img = new Image()
  img.src = backdropSrc.value
  img.addEventListener('load', () => {
    backdropImg.value = img
  })
})

const konvaBackdropConfig = computed(() => {
  if (backdropImg.value == null || stageConfig.value == null) {
    return null
  }

  const stageWidth = mapSize.value.width
  const stageHeight = mapSize.value.height
  const imageWidth = backdropImg.value.width
  const imageHeight = backdropImg.value.height

  if (editorCtx.project.stage.mapMode === MapMode.fillRatio) {
    const scaleX = stageWidth / imageWidth
    const scaleY = stageHeight / imageHeight
    const scale = Math.max(scaleX, scaleY) // Use max to cover the entire stage

    const width = imageWidth * scale
    const height = imageHeight * scale
    const x = (stageWidth - width) / 2
    const y = (stageHeight - height) / 2

    return {
      fillPatternImage: backdropImg.value,
      width: stageWidth,
      height: stageHeight,
      fillPatternRepeat: 'no-repeat',
      fillPatternX: x,
      fillPatternY: y,
      fillPatternScaleX: scale,
      fillPatternScaleY: scale
    }
  } else if (editorCtx.project.stage.mapMode === MapMode.repeat) {
    const offsetX = (stageWidth - imageWidth) / 2
    const offsetY = (stageHeight - imageHeight) / 2

    return {
      fillPatternImage: backdropImg.value,
      width: stageWidth,
      height: stageHeight,
      fillPatternRepeat: 'repeat',
      fillPatternX: offsetX,
      fillPatternY: offsetY,
      fillPatternScaleX: 1,
      fillPatternScaleY: 1
    }
  }
  console.warn('Unsupported map mode:', editorCtx.project.stage.mapMode)
  return null
})

const loading = computed(() => {
  if (backdropSrcLoading.value || !backdropImg.value) return true
  if (editorCtx.project.sprites.some((s) => !nodeReadyMap.get(getNodeName(s)))) return true
  if (editorCtx.project.stage.widgets.some((w) => !nodeReadyMap.get(getNodeName(w)))) return true
  return false
})

const visibleSprites = computed(() => {
  const { zorder, sprites } = editorCtx.project
  return zorder.map((name) => sprites.find((s) => s.name === name)).filter(Boolean) as Sprite[]
})

const visibleWidgets = computed(() => {
  const { widgetsZorder, widgets } = editorCtx.project.stage
  return widgetsZorder
    .map((name) => widgets.find((w) => w.name === name))
    .filter(Boolean) as Widget[]
})

const menuVisible = ref(false)
const menuPos = ref({ x: 0, y: 0 })

function handleContextMenu(e: KonvaEventObject<MouseEvent>) {
  e.evt.preventDefault()

  // Ignore right click on backdrop.
  // Konva.Rect is a subclass of Konva.Shape.
  // Currently we have all sprites as Konva.Shape and backdrop as Konva.Rect.
  if (e.target instanceof Konva.Rect) return

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

const moveActionNames = {
  up: { en: 'Bring forward', zh: '向前移动' },
  top: { en: 'Bring to front', zh: '移到最前' },
  down: { en: 'Send backward', zh: '向后移动' },
  bottom: { en: 'Send to back', zh: '移到最后' }
}

async function moveZorder(direction: 'up' | 'down' | 'top' | 'bottom') {
  const project = editorCtx.project
  const selectedSprite = project.selectedSprite
  const selectedWidget = project.stage.selectedWidget
  await project.history.doAction({ name: moveActionNames[direction] }, () => {
    if (selectedSprite != null) {
      if (direction === 'up') {
        project.upSpriteZorder(selectedSprite.name)
      } else if (direction === 'down') {
        project.downSpriteZorder(selectedSprite.name)
      } else if (direction === 'top') {
        project.topSpriteZorder(selectedSprite.name)
      } else if (direction === 'bottom') {
        project.bottomSpriteZorder(selectedSprite.name)
      }
    } else if (selectedWidget != null) {
      if (direction === 'up') {
        project.stage.upWidgetZorder(selectedWidget.name)
      } else if (direction === 'down') {
        project.stage.downWidgetZorder(selectedWidget.name)
      } else if (direction === 'top') {
        project.stage.topWidgetZorder(selectedWidget.name)
      } else if (direction === 'bottom') {
        project.stage.bottomWidgetZorder(selectedWidget.name)
      }
    }
  })
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

  overflow: hidden;
}
</style>
