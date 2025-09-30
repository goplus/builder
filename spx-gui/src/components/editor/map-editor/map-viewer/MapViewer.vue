<script setup lang="ts">
import { throttle } from 'lodash'
import { computed, reactive, ref, watch, watchEffect } from 'vue'
import Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { Stage } from 'konva/lib/Stage'
import type { LayerConfig } from 'konva/lib/Layer'
import { UIDropdown, UILoading, UIMenu, UIMenuItem } from '@/components/ui'
import { useContentSize } from '@/utils/dom'
import { useFileUrl } from '@/utils/file'
import { untilTaskScheduled } from '@/utils/utils'
import { getCleanupSignal } from '@/utils/disposable'
import type { Project } from '@/models/project'
import type { Sprite } from '@/models/sprite'
import { MapMode } from '@/models/stage'
import NodeTransformer from '@/components/editor/common/viewer/NodeTransformer.vue'
import { getNodeId } from '@/components/editor/common/viewer/common'
import SpriteNode, { type CameraScrollNotifyFn } from '@/components/editor/common/viewer/SpriteNode.vue'
import PositionIndicator from '@/components/editor/common/viewer/PositionIndicator.vue'

const props = defineProps<{
  project: Project
  selectedSprite: Sprite | null
}>()

const emit = defineEmits<{
  'update:selectedSprite': [sprite: Sprite | null]
}>()

const container = ref<HTMLElement | null>(null)
const containerSize = useContentSize(container)
const viewportSize = containerSize

type Pos = { x: number; y: number }

const stageRef = ref<{
  getStage(): Konva.Stage
}>()
const stageConfig = computed(() => containerSize.value)
const mapRef = ref<{
  getNode(): Konva.Layer
}>()
const mapSize = computed(() => props.project.stage.getMapSize())
const nodeTransformerRef = ref<InstanceType<typeof NodeTransformer>>()
const nodeReadyMap = reactive(new Map<string, boolean>())
const mousePos = ref<Pos | null>(null)

const updateMousePos = throttle(() => {
  // Event `mousemove` may be triggered when mouse is out of stage with negative mouse position, we ignore such case.
  const pointerPosOnStage = stageRef.value?.getStage().getPointerPosition()
  if (pointerPosOnStage == null || pointerPosOnStage.x < 0 || pointerPosOnStage.y < 0) return

  const pointerPos = mapRef.value?.getNode().getRelativePointerPosition()
  if (pointerPos == null) return
  mousePos.value = {
    x: Math.round(pointerPos.x - mapSize.value.width / 2),
    y: Math.round(mapSize.value.height / 2 - pointerPos.y)
  }
}, 50)

function handleSpriteSelected(sprite: Sprite) {
  emit('update:selectedSprite', sprite)
}

const mapScale = ref(1)

/** Scale value to fit the map in the stage */
const fittingMapScale = computed(() => {
  if (viewportSize.value == null) return null
  const widthScale = viewportSize.value.width / mapSize.value.width
  const heightScale = viewportSize.value.height / mapSize.value.height
  return Math.min(widthScale, heightScale)
})

const minMapScale = computed(() => {
  return fittingMapScale.value == null ? null : fittingMapScale.value * 0.8
})

const maxMapScale = computed(() => {
  if (fittingMapScale.value == null) return null
  return Math.max(fittingMapScale.value * 2, 2)
})

function setMapScale(scale: number) {
  if (minMapScale.value != null && scale < minMapScale.value) scale = minMapScale.value
  if (maxMapScale.value != null && scale > maxMapScale.value) scale = maxMapScale.value
  mapScale.value = scale
  return scale
}

const mapPos = ref<Pos>({ x: 0, y: 0 })

const mapPosLimit = computed(() => {
  const vSize = viewportSize.value
  if (vSize == null) return null
  const scale = mapScale.value
  // We ensure that at least one pixel (of map) is in the (0.6x) center of the stage
  return {
    minX: vSize.width * 0.2 - mapSize.value.width * scale,
    maxX: vSize.width * 0.8,
    minY: vSize.height * 0.2 - mapSize.value.height * scale,
    maxY: vSize.height * 0.8
  }
})

function getValidMapPos({ x, y }: Pos) {
  const limit = mapPosLimit.value
  if (limit == null) return { x, y }
  const { minX, maxX, minY, maxY } = limit
  if (x < minX) x = minX
  if (x > maxX) x = maxX
  if (y < minY) y = minY
  if (y > maxY) y = maxY
  return { x, y }
}

function setMapPos(pos: Pos) {
  mapPos.value = getValidMapPos(pos)
  return mapPos.value
}

async function setMapPosWithTransition(pos: Pos, durationInMs: number) {
  if (mapRef.value == null) {
    setMapPos(pos)
    return
  }
  const mapNode = mapRef.value.getNode()
  const newMapPos = getValidMapPos(pos)
  return new Promise<void>((resolve) => {
    new Konva.Tween({
      node: mapNode,
      duration: durationInMs / 1000,
      x: newMapPos.x,
      y: newMapPos.y,
      onFinish: () => {
        setMapPos(newMapPos)
        resolve()
      }
    }).play()
  })
}

// When viewport size or map size changes, fit the map in the viewport and center it.
watch(
  [viewportSize, mapSize, fittingMapScale],
  async ([vSize, mSize, targetScale]) => {
    if (vSize == null || targetScale == null) return
    const scale = setMapScale(targetScale)
    setMapPos({
      x: (vSize.width - mSize.width * scale) / 2,
      y: (vSize.height - mSize.height * scale) / 2
    })
  },
  { immediate: true }
)

/** Check if given position (in game) is in viewport */
function inViewport({ x, y }: Pos) {
  if (viewportSize.value == null) return true
  const xInViewport = (x + mapSize.value.width / 2) * mapScale.value + mapPos.value.x
  const yInViewport = (-y + mapSize.value.height / 2) * mapScale.value + mapPos.value.y
  return (
    xInViewport >= 0 &&
    xInViewport <= viewportSize.value.width &&
    yInViewport >= 0 &&
    yInViewport <= viewportSize.value.height
  )
}

watch(
  () => props.selectedSprite,
  async (selectedSprite, _, onCleanup) => {
    await untilTaskScheduled('user-visible', getCleanupSignal(onCleanup))
    if (selectedSprite != null && viewportSize.value != null && !inViewport(selectedSprite)) {
      const mapPosForSprite = {
        x: viewportSize.value.width / 2 - (mapSize.value.width / 2 + selectedSprite.x) * mapScale.value,
        y: viewportSize.value.height / 2 - (mapSize.value.height / 2 - selectedSprite.y) * mapScale.value
      }
      setMapPosWithTransition(mapPosForSprite, 300)
    }
  },
  { immediate: true }
)

const mapConfig = computed(() => {
  return {
    ...mapPos.value,
    draggable: true,
    scale: { x: mapScale.value, y: mapScale.value },
    imageSmoothingEnabled: false
  } satisfies LayerConfig
})

watch(mapConfig, updateMousePos)

function handleMapDragMove(e: KonvaEventObject<MouseEvent>) {
  const map = e.target
  const { x, y } = getValidMapPos({ x: map.x(), y: map.y() })
  map.x(x)
  map.y(y)
}

function handleMapDragEnd(e: KonvaEventObject<MouseEvent>) {
  const map = e.target
  setMapPos({ x: map.x(), y: map.y() })
}

const backdropImg = ref<HTMLImageElement | null>(null)
const [backdropSrc, backdropSrcLoading] = useFileUrl(() => props.project.stage.defaultBackdrop?.img)
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

  if (props.project.stage.mapMode === MapMode.fillRatio) {
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
  } else if (props.project.stage.mapMode === MapMode.repeat) {
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
  console.warn('Unsupported map mode:', props.project.stage.mapMode)
  return null
})

const loading = computed(() => {
  const backdropExists = props.project.stage.defaultBackdrop != null
  if (backdropExists && (backdropSrcLoading.value || !backdropImg.value)) return true
  if (props.project.sprites.some((s) => !nodeReadyMap.get(getNodeId(s)))) return true
  return false
})

const visibleSprites = computed(() => {
  const { zorder, sprites } = props.project
  return zorder.map((id) => sprites.find((s) => s.id === id)).filter(Boolean) as Sprite[]
})

let cameraEdgeScrollCheckTimer: ReturnType<typeof setInterval> | null = null

function clearCameraEdgeScrollCheckTimer() {
  if (cameraEdgeScrollCheckTimer == null) return
  clearInterval(cameraEdgeScrollCheckTimer)
  cameraEdgeScrollCheckTimer = null
}

const cameraEdgeScrollConfig = {
  edgeThreshold: 50, // px
  scrollSpeed: 20, // px per interval
  interval: 50 // ms
}

const handleSpriteDragMove = throttle(
  function handleSpriteDragMove(notifyCameraScroll: CameraScrollNotifyFn) {
    if (cameraEdgeScrollCheckTimer != null) return
    if (stageRef.value == null) return
    const stage = stageRef.value.getStage()
    const { edgeThreshold, scrollSpeed, interval } = cameraEdgeScrollConfig

    cameraEdgeScrollCheckTimer = setInterval(() => {
      const pointerPos = stage.getPointerPosition()
      if (pointerPos == null) {
        clearCameraEdgeScrollCheckTimer()
        return
      }

      const oldMapPos = mapPos.value
      const targetMapPos = { ...oldMapPos }
      if (pointerPos.x < edgeThreshold) {
        targetMapPos.x += (scrollSpeed / edgeThreshold) * (edgeThreshold - pointerPos.x)
      } else if (pointerPos.x > stage.width() - edgeThreshold) {
        targetMapPos.x -= (scrollSpeed / edgeThreshold) * (pointerPos.x - (stage.width() - edgeThreshold))
      }
      if (pointerPos.y < edgeThreshold) {
        targetMapPos.y += (scrollSpeed / edgeThreshold) * (edgeThreshold - pointerPos.y)
      } else if (pointerPos.y > stage.height() - edgeThreshold) {
        targetMapPos.y -= (scrollSpeed / edgeThreshold) * (pointerPos.y - (stage.height() - edgeThreshold))
      }
      const newMapPos = setMapPos(targetMapPos)
      notifyCameraScroll({
        x: (newMapPos.x - oldMapPos.x) / mapScale.value,
        y: (newMapPos.y - oldMapPos.y) / mapScale.value
      })
    }, interval)
  },
  100,
  {
    trailing: false // Ensure cameraEdgeScrollCheckTimer properly cleared in handleSpriteDragEnd
  }
)

function handleSpriteDragEnd() {
  clearCameraEdgeScrollCheckTimer()
}

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
  const { project, selectedSprite } = props
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
    }
  })
  menuVisible.value = false
}

function handleBackdropClick() {
  emit('update:selectedSprite', null)
}

const scaleBy = 1.02

const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
  e.evt.preventDefault()
  const map = e.target
  const oldScale = mapScale.value
  const pointer = map.getStage()?.getPointerPosition()
  if (pointer == null) return

  const mousePointTo = {
    x: (pointer.x - mapPos.value.x) / oldScale,
    y: (pointer.y - mapPos.value.y) / oldScale
  }
  const newScale = setMapScale(e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy)
  setMapPos({
    x: pointer.x - mousePointTo.x * newScale,
    y: pointer.y - mousePointTo.y * newScale
  })
}
</script>

<template>
  <div
    ref="container"
    v-radar="{
      name: 'Map viewer',
      desc: 'View and manipulate the map and sprites on the map. Click on sprite to select it.'
    }"
    class="map-viewer"
    @mousemove="updateMousePos"
  >
    <v-stage
      v-if="stageConfig != null"
      ref="stageRef"
      :config="stageConfig"
      @mousedown="handleStageMousedown"
      @contextmenu="handleContextMenu"
      @wheel="handleWheel"
    >
      <v-layer ref="mapRef" :config="mapConfig" @dragmove="handleMapDragMove" @dragend="handleMapDragEnd">
        <v-rect v-if="konvaBackdropConfig" :config="konvaBackdropConfig" @click="handleBackdropClick"></v-rect>
        <SpriteNode
          v-for="sprite in visibleSprites"
          :key="sprite.id"
          :sprite="sprite"
          :selected="selectedSprite?.id === sprite.id"
          :project="props.project"
          :map-size="mapSize!"
          :node-ready-map="nodeReadyMap"
          @drag-move="handleSpriteDragMove"
          @drag-end="handleSpriteDragEnd"
          @selected="handleSpriteSelected(sprite)"
        />
      </v-layer>
      <v-layer>
        <NodeTransformer ref="nodeTransformerRef" :node-ready-map="nodeReadyMap" :target="selectedSprite" />
      </v-layer>
    </v-stage>
    <UIDropdown trigger="manual" :visible="menuVisible" :pos="menuPos" placement="bottom-start">
      <UIMenu>
        <UIMenuItem
          v-radar="{ name: 'Move up', desc: 'Click to move sprite up in z-order' }"
          @click="moveZorder('up')"
          >{{ $t(moveActionNames.up) }}</UIMenuItem
        >
        <UIMenuItem
          v-radar="{ name: 'Move to top', desc: 'Click to move sprite to top in z-order' }"
          @click="moveZorder('top')"
          >{{ $t(moveActionNames.top) }}</UIMenuItem
        >
        <UIMenuItem
          v-radar="{ name: 'Move down', desc: 'Click to move sprite down in z-order' }"
          @click="moveZorder('down')"
          >{{ $t(moveActionNames.down) }}</UIMenuItem
        >
        <UIMenuItem
          v-radar="{ name: 'Move to bottom', desc: 'Click to move sprite to bottom in z-order' }"
          @click="moveZorder('bottom')"
          >{{ $t(moveActionNames.bottom) }}</UIMenuItem
        >
      </UIMenu>
    </UIDropdown>
    <PositionIndicator :position="mousePos" />
    <UILoading :visible="loading" cover />
  </div>
</template>

<style scoped>
.map-viewer {
  height: 100%;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;

  border-radius: var(--ui-border-radius-3);
  overflow: hidden;
  background-image: url(@/assets/images/stage-bg.svg);
  background-position: center;
  background-repeat: repeat;
  background-size: contain;
  position: relative;
}
</style>
