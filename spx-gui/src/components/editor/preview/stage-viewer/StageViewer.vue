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
          :key="sprite.id"
          :sprite="sprite"
          :map-size="mapSize!"
          :node-ready-map="nodeReadyMap"
        />
      </v-layer>
      <v-layer>
        <WidgetNode
          v-for="widget in visibleWidgets"
          :key="widget.id"
          :widget="widget"
          :map-size="mapSize!"
          :node-ready-map="nodeReadyMap"
        />
      </v-layer>
      <v-layer>
        <NodeTransformer ref="nodeTransformerRef" :node-ready-map="nodeReadyMap" />
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
import { until, untilNotNull } from '@/utils/utils'
import type { Sprite } from '@/models/sprite'
import { MapMode } from '@/models/stage'
import type { Widget } from '@/models/widget'
import { createFileWithWebUrl } from '@/models/common/cloud'
import { useEditorCtx } from '../../EditorContextProvider.vue'
import NodeTransformer from './NodeTransformer.vue'
import SpriteNode from './SpriteNode.vue'
import WidgetNode from './widgets/WidgetNode.vue'
import { getNodeId } from './node'

const editorCtx = useEditorCtx()
const conatiner = ref<HTMLElement | null>(null)
const containerSize = useContentSize(conatiner)

const stageRef = ref<{
  getStage(): Konva.Stage
}>()
const mapSize = computed(() => editorCtx.project.stage.getMapSize())
const nodeTransformerRef = ref<InstanceType<typeof NodeTransformer>>()

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
const [backdropSrc, backdropSrcLoading] = useFileUrl(() => editorCtx.project.stage.defaultBackdrop?.img)
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
  if (editorCtx.project.sprites.some((s) => !nodeReadyMap.get(getNodeId(s)))) return true
  if (editorCtx.project.stage.widgets.some((w) => !nodeReadyMap.get(getNodeId(w)))) return true
  return false
})

const visibleSprites = computed(() => {
  const { zorder, sprites } = editorCtx.project
  return zorder.map((id) => sprites.find((s) => s.id === id)).filter(Boolean) as Sprite[]
})

const visibleWidgets = computed(() => {
  const { widgetsZorder, widgets } = editorCtx.project.stage
  return widgetsZorder.map((id) => widgets.find((w) => w.id === id)).filter(Boolean) as Widget[]
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
        project.upSpriteZorder(selectedSprite.id)
      } else if (direction === 'down') {
        project.downSpriteZorder(selectedSprite.id)
      } else if (direction === 'top') {
        project.topSpriteZorder(selectedSprite.id)
      } else if (direction === 'bottom') {
        project.bottomSpriteZorder(selectedSprite.id)
      }
    } else if (selectedWidget != null) {
      if (direction === 'up') {
        project.stage.upWidgetZorder(selectedWidget.id)
      } else if (direction === 'down') {
        project.stage.downWidgetZorder(selectedWidget.id)
      } else if (direction === 'top') {
        project.stage.topWidgetZorder(selectedWidget.id)
      } else if (direction === 'bottom') {
        project.stage.bottomWidgetZorder(selectedWidget.id)
      }
    }
  })
  menuVisible.value = false
}

async function takeScreenshot(name: string, signal?: AbortSignal) {
  const stage = await untilNotNull(stageRef, signal)
  const nodeTransformer = await untilNotNull(nodeTransformerRef, signal)
  await until(() => !loading.value, signal)
  // Omit transform control when taking screenshot
  const dataUrl = nodeTransformer.withHidden(() =>
    stage.getStage().toDataURL({
      mimeType: 'image/jpeg'
    })
  )
  return createFileWithWebUrl(dataUrl, `${name}.jpg`)
}

watchEffect((onCleanup) => {
  const unbind = editorCtx.project.bindScreenshotTaker(takeScreenshot)
  onCleanup(unbind)
})
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
