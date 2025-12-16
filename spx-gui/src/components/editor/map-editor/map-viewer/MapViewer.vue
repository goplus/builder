<script lang="ts">
function getVisibleChildrenUnionRect(root: Element) {
  let newRect: DOMRect | null = null

  function isVisible(node: Element) {
    const style = window.getComputedStyle(node)
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0'
  }

  const stack = [root]
  while (stack.length > 0) {
    const node = stack.pop()
    if (!node || !isVisible(node)) continue

    const rect = node.getBoundingClientRect()

    if (rect.width > 0 && rect.height > 0) {
      if (newRect == null) {
        newRect = rect
      } else {
        const left = Math.min(newRect.left, rect.left)
        const top = Math.min(newRect.top, rect.top)
        const right = Math.max(newRect.right, rect.right)
        const bottom = Math.max(newRect.bottom, rect.bottom)
        newRect = new DOMRect(left, top, right - left, bottom - top)
      }
    } else {
      if (node.children && node.children.length > 0) {
        for (let i = node.children.length - 1; i >= 0; i--) {
          stack.push(node.children[i])
        }
      }
    }
  }

  return newRect
}
</script>

<script setup lang="ts">
import { debounce, throttle } from 'lodash'
import { computed, nextTick, onMounted, reactive, ref, shallowRef, watch, watchEffect } from 'vue'
import Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { LayerConfig } from 'konva/lib/Layer'

import { UILoading } from '@/components/ui'
import { useContentSize } from '@/utils/dom'
import { useFileUrl } from '@/utils/file'
import { timeout, until, untilTaskScheduled } from '@/utils/utils'
import { getCleanupSignal } from '@/utils/disposable'
import type { Project } from '@/models/project'
import type { Sprite } from '@/models/sprite'
import { MapMode } from '@/models/stage'
import NodeTransformer from '@/components/editor/common/viewer/NodeTransformer.vue'
import { getNodeId } from '@/components/editor/common/viewer/common'
import SpriteNode, { type CameraScrollNotifyFn } from '@/components/editor/common/viewer/SpriteNode.vue'
import DecoratorNode from '@/components/editor/common/viewer/DecoratorNode.vue'
import PositionIndicator from '@/components/editor/common/viewer/PositionIndicator.vue'
import QuickConfig, { type ConfigType } from '@/components/editor/common/viewer/quick-config/QuickConfig.vue'
import SpriteConfigor from '@/components/editor/common/viewer/quick-config/SpriteConfigor.vue'

const props = defineProps<{
  project: Project
  selectedSprite: Sprite | null
}>()

const emit = defineEmits<{
  'update:selectedSprite': [sprite: Sprite | null]
}>()

const container = ref<HTMLElement | null>(null)
const containerSizeRef = useContentSize(container)
// Konva canvas cannot have a width or height of zero
const containerSize = shallowRef(containerSizeRef.value)
watchEffect(() => {
  const value = containerSizeRef.value
  if (value != null && value.width !== 0 && value.height !== 0) {
    containerSize.value = value
  }
})

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
  updateQuickConfigPosThrottled()
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

// quick configor
const configTypesRef = ref<ConfigType[]>([{ type: 'default' }])
function createConfigType(configType: ConfigType): ConfigType[] {
  return [{ type: 'default' }, configType]
}
function handleUpdatePosConfigType({ x, y }: { x: number; y: number }) {
  configTypesRef.value = createConfigType({ type: 'pos', x, y })
}
function handleUpdateSizeConfigType({ size }: { size: number }) {
  configTypesRef.value = createConfigType({ type: 'size', size })
  nextTick(updateQuickConfigPosThrottled)
}
function handleUpdateRotateConfigType({ heading }: { heading: number }) {
  configTypesRef.value = createConfigType({ type: 'rotate', rotate: heading })
  nextTick(updateQuickConfigPosThrottled)
}
onMounted(async () => {
  await until(() => !loading.value)
  updateQuickConfigPos()
})

function handleSpriteDragEnd() {
  clearCameraEdgeScrollCheckTimer()
  updateQuickConfigPosThrottled()
}

const quickConfigRef = ref<InstanceType<typeof QuickConfig> | null>(null)
const quickConfigElRef = computed(() => quickConfigRef.value?.quickConfigDom())
const quickConfigPopupContainerElRef = computed(() => quickConfigRef.value?.quickConfigPopupContainerDom())
watch(
  quickConfigPopupContainerElRef,
  (container, _, onCleanup) => {
    if (!container) return
    const observer = new MutationObserver(debounce(updateQuickConfigPos, 100))
    observer.observe(container, { childList: true, subtree: true, attributes: true })
    onCleanup(() => observer.disconnect())
  },
  { immediate: true }
)

function updateQuickConfigPos() {
  if (
    props.selectedSprite == null ||
    stageRef.value == null ||
    // quick configor is not open
    configTypesRef.value.length === 0 ||
    containerSize.value == null ||
    quickConfigElRef.value == null ||
    quickConfigPopupContainerElRef.value == null
  ) {
    return
  }

  const node = nodeTransformerRef.value?.getNode()
  if (node == null) return

  const quickConfigEl = quickConfigElRef.value
  const quickConfigRect = quickConfigEl.getBoundingClientRect()
  const popupContainerRect = getVisibleChildrenUnionRect(quickConfigPopupContainerElRef.value)

  let leftExtension = 30
  let rightExtension = 30
  let topExtension = 30
  let bottomExtension = 30

  if (popupContainerRect && popupContainerRect.width > 0 && popupContainerRect.height > 0) {
    const { left: configLeft, right: configRight, top: configTop, bottom: configBottom } = quickConfigRect
    const {
      left: popupContainerLeft,
      right: popupContainerRight,
      top: popupContainerTop,
      bottom: popupContainerBottom
    } = popupContainerRect
    if (popupContainerLeft < configLeft) {
      leftExtension += configLeft - popupContainerLeft
    }
    if (popupContainerRight > configRight) {
      rightExtension += popupContainerRight - configRight
    }
    if (popupContainerTop < configTop) {
      topExtension += configTop - popupContainerTop
    }
    if (popupContainerBottom > configBottom) {
      bottomExtension += popupContainerBottom - configBottom
    }
  }

  const { width: configWidth, height: configHeight } = quickConfigRect
  const containerW = containerSize.value.width
  const containerH = containerSize.value.height

  const nodeWidth = node.width()
  const nodeHeight = node.height()
  const nodeOffsetX = node.offsetX()
  const nodeOffsetY = node.offsetY()
  const transform = node.getAbsoluteTransform()
  const center = transform.point({
    x: nodeWidth / 2 - nodeOffsetX,
    y: nodeHeight / 2 - nodeOffsetY
  })
  const corners = [
    { x: -nodeOffsetX, y: -nodeOffsetY },
    { x: nodeWidth - nodeOffsetX, y: -nodeOffsetY },
    { x: nodeWidth - nodeOffsetX, y: nodeHeight - nodeOffsetY },
    { x: -nodeOffsetX, y: nodeHeight - nodeOffsetY }
  ]
  let top = center.y
  corners.forEach((point) => {
    const globalPoint = transform.point(point)
    if (globalPoint.y > top) {
      top = globalPoint.y
    }
  })

  const GAP = 48
  top += GAP
  let left = center.x

  const halfConfigWidth = configWidth / 2
  if (left - leftExtension - halfConfigWidth < 0) {
    left = leftExtension + halfConfigWidth
  } else if (left + halfConfigWidth + rightExtension > containerW) {
    left = containerW - halfConfigWidth - rightExtension
  }

  if (top + configHeight + bottomExtension > containerH) {
    top = containerH - configHeight - bottomExtension
  }
  if (top - topExtension < 0) {
    top = topExtension
  }

  quickConfigEl.style.cssText = `transform: translate(${left}px, ${top}px) translateX(-50%)`
}
const updateQuickConfigPosThrottled = throttle(updateQuickConfigPos, 50, { trailing: true })
watch(
  // Respond to changes in rotationStyle to avoid quick config position issues
  () => [props.selectedSprite, props.selectedSprite?.rotationStyle],
  async ([sprite]) => {
    if (sprite == null) return
    await timeout(0)
    updateQuickConfigPosThrottled()
  },
  { immediate: true }
)

// Also update when map transforms (pan/zoom)
watch(mapConfig, updateQuickConfigPosThrottled)
// Update when container resizes
watch(containerSize, updateQuickConfigPosThrottled)

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
    <v-stage v-if="stageConfig != null" ref="stageRef" :config="stageConfig" @wheel="handleWheel">
      <v-layer ref="mapRef" :config="mapConfig" @dragmove="handleMapDragMove" @dragend="handleMapDragEnd">
        <v-rect v-if="konvaBackdropConfig" :config="konvaBackdropConfig"></v-rect>
        <DecoratorNode
          v-for="(decorator, idx) in props.project.tilemap?.decorators ?? []"
          :key="idx"
          :decorator="decorator"
          :map-size="mapSize"
        />
        <!-- Refer to: spx-gui/src/components/editor/preview/stage-viewer/StageViewer.vue -->
        <v-group>
          <SpriteNode
            v-for="sprite in visibleSprites"
            :key="sprite.id"
            :sprite="sprite"
            :selected="selectedSprite?.id === sprite.id"
            :project="props.project"
            :map-size="mapSize"
            :node-ready-map="nodeReadyMap"
            @drag-move="handleSpriteDragMove"
            @drag-end="handleSpriteDragEnd"
            @selected="handleSpriteSelected(sprite)"
            @update-heading="handleUpdateRotateConfigType"
            @update-pos="handleUpdatePosConfigType"
            @update-size="handleUpdateSizeConfigType"
          />
        </v-group>
      </v-layer>
      <v-layer>
        <NodeTransformer ref="nodeTransformerRef" :node-ready-map="nodeReadyMap" :target="selectedSprite" />
      </v-layer>
    </v-stage>
    <QuickConfig
      ref="quickConfigRef"
      class="quick-config"
      :config-types="configTypesRef"
      @update-config-types="configTypesRef = $event"
    >
      <SpriteConfigor v-if="selectedSprite" :sprite="selectedSprite" :project="project" />
    </QuickConfig>

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

  & > div {
    outline: none;
  }
}

.quick-config {
  position: absolute;
  top: 0;
  left: 0;
}
</style>
