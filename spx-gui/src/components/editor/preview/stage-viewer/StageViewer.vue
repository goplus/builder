<template>
  <div
    ref="container"
    v-radar="{
      name: 'Stage viewer',
      desc: 'View and manipulate the stage and objects (sprites, widgets, etc.) on the stage. Click on object to select it.'
    }"
    class="stage-viewer"
    @mousemove="updateMousePos"
  >
    <v-stage v-if="stageConfig != null" ref="stageRef" :config="stageConfig" @wheel="handleWheel">
      <v-layer ref="mapRef" :config="mapConfig" @dragmove="handleMapDragMove" @dragend="handleMapDragEnd">
        <v-rect v-if="konvaBackdropConfig" :config="konvaBackdropConfig"></v-rect>
        <DecoratorNode
          v-for="(decorator, idx) in editorCtx.project.tilemap?.decorators ?? []"
          :key="idx"
          :decorator="decorator"
          :map-size="mapSize"
        />
        <!-- 
          Why is v-group needed?
          For example, assuming there are two SpriteNodes, the layer is expected to be [v-rect, v-image, v-image], but the result might be [v-image, v-image, v-rect].
          This causes the v-rect position to be unexpected, obscuring the v-image.
          After investigation, it was found that SpriteNode calls zIndex(zIndex) internally. 
          If zIndex is smaller than the index of v-rect in the layer children, its position will be further forward.
          When v-rect starts rendering before visibleSprites, the above scenario will occur. 
          Although vue-konva will correct the order of children in the layer based on the order of vnodes through checkOrder, it is not very stable.
          So v-group is added so that SpriteNode zIndex(zIndex) does not affect v-rect.
        -->
        <v-group>
          <SpriteNode
            v-for="sprite in visibleSprites"
            :key="sprite.id"
            :sprite="sprite"
            :selected="editorCtx.state.selectedSprite?.id === sprite.id"
            :project="editorCtx.project"
            :map-size="mapSize"
            :node-ready-map="nodeReadyMap"
            @drag-move="handleSpriteDragMove"
            @drag-end="handleSpriteDragEnd"
            @selected="handleSpriteSelected(sprite)"
            @open-configor="handleOpenConfigor"
            @update-heading="handleUpdateConfigType('rotate')"
            @update-pos="handleUpdateConfigType('pos')"
            @update-size="handleUpdateConfigType('size')"
          />
        </v-group>
      </v-layer>
      <v-layer>
        <WidgetNode
          v-for="widget in visibleWidgets"
          :key="widget.id"
          :widget="widget"
          :viewport-size="viewportSize"
          :node-ready-map="nodeReadyMap"
          @open-configor="handleOpenConfigor"
          @update-pos="handleUpdateConfigType('pos')"
          @update-size="handleUpdateConfigType('size')"
        />
      </v-layer>
      <v-layer>
        <NodeTransformer
          ref="nodeTransformerRef"
          :node-ready-map="nodeReadyMap"
          :target="editorCtx.state.selectedSprite ?? editorCtx.state.selectedWidget"
        />
      </v-layer>
    </v-stage>
    <QuickConfig class="quick-config" :config-types="configTypesRef" @update-config-types="configTypesRef = $event">
      <SpriteConfigor
        v-if="editorCtx.state.selectedSprite"
        :sprite="editorCtx.state.selectedSprite"
        :project="editorCtx.project"
      />
      <WidgetConfigor
        v-else-if="editorCtx.state.selectedWidget"
        :widget="editorCtx.state.selectedWidget"
        :project="editorCtx.project"
      />
    </QuickConfig>
    <PositionIndicator :position="mousePos" />
    <UILoading :visible="loading" cover />
  </div>
</template>

<script setup lang="ts">
import { throttle } from 'lodash'
import { computed, reactive, ref, shallowRef, watch, watchEffect } from 'vue'
import Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { StageConfig } from 'konva/lib/Stage'
import type { LayerConfig } from 'konva/lib/Layer'
import { UILoading } from '@/components/ui'
import { useContentSize } from '@/utils/dom'
import { useFileUrl } from '@/utils/file'
import { untilTaskScheduled, until, untilNotNull } from '@/utils/utils'
import { getCleanupSignal } from '@/utils/disposable'
import { fromBlob } from '@/models/common/file'
import type { Sprite } from '@/models/sprite'
import { MapMode } from '@/models/stage'
import type { Widget } from '@/models/widget'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import NodeTransformer from '@/components/editor/common/viewer/NodeTransformer.vue'
import { getNodeId } from '@/components/editor/common/viewer/common'
import SpriteNode, { type CameraScrollNotifyFn } from '@/components/editor/common/viewer/SpriteNode.vue'
import SpriteConfigor from '@/components/editor/common/viewer/quick-config/SpriteConfigor.vue'
import WidgetConfigor from '@/components/editor/common/viewer/quick-config/WidgetConfigor.vue'
import DecoratorNode from '@/components/editor/common/viewer/DecoratorNode.vue'
import PositionIndicator from '@/components/editor/common/viewer/PositionIndicator.vue'
import WidgetNode from './widgets/WidgetNode.vue'
import QuickConfig, { type ConfigType } from '@/components/editor/common/viewer/quick-config/QuickConfig.vue'

const editorCtx = useEditorCtx()
const container = ref<HTMLDivElement | null>(null)
const containerSizeRef = useContentSize(container)
// Konva canvas cannot have a width or height of zero
const containerSize = shallowRef(containerSizeRef.value)
watchEffect(() => {
  const value = containerSizeRef.value
  if (value != null && value.width !== 0 && value.height !== 0) {
    containerSize.value = value
  }
})

type Pos = { x: number; y: number }

const stageRef = ref<{
  getStage(): Konva.Stage
}>()
const mapRef = ref<{
  getNode(): Konva.Layer
}>()
const viewportSize = computed(() => editorCtx.project.viewportSize)
const mapSize = computed(() => editorCtx.project.stage.getMapSize())
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

/** containerSize / viewportSize */
const stageScale = computed(() => {
  if (containerSize.value == null) return null
  const widthScale = containerSize.value.width / viewportSize.value.width
  const heightScale = containerSize.value.height / viewportSize.value.height
  return Math.min(widthScale, heightScale)
})

const stageConfig = computed(() => {
  if (stageScale.value == null || viewportSize.value == null || container.value == null) return null
  const width = viewportSize.value.width * stageScale.value
  const height = viewportSize.value.height * stageScale.value
  return {
    container: container.value,
    width,
    height,
    scale: {
      x: stageScale.value,
      y: stageScale.value
    }
  } satisfies StageConfig
})

const mapPosLimit = computed(() => {
  return {
    minX: viewportSize.value.width - mapSize.value.width,
    maxX: 0,
    minY: viewportSize.value.height - mapSize.value.height,
    maxY: 0
  }
})

/** The position to be applied on the map node to achieve camera effect */
const mapPos = ref<Pos>({ x: 0, y: 0 })

function getValidMapPos(pos: Pos) {
  return {
    x: Math.min(Math.max(pos.x, mapPosLimit.value.minX), mapPosLimit.value.maxX),
    y: Math.min(Math.max(pos.y, mapPosLimit.value.minY), mapPosLimit.value.maxY)
  }
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

/** Check if given position (in game) is in viewport */
function inViewport({ x, y }: Pos) {
  const xInViewport = x + mapSize.value.width / 2 + mapPos.value.x
  const yInViewport = -y + mapSize.value.height / 2 + mapPos.value.y
  return (
    xInViewport >= 0 &&
    xInViewport <= viewportSize.value.width &&
    yInViewport >= 0 &&
    yInViewport <= viewportSize.value.height
  )
}

// Update map position (to a valid position) when viewport size or map size changes
watch([viewportSize, mapSize], () => setMapPos(mapPos.value))

// If camera enabled, update camera behavior when selected sprite changes
watch(
  () => editorCtx.state.selectedSprite,
  async (selectedSprite, _, onCleanup) => {
    const project = editorCtx.project
    if (!project.isCameraEnabled) return

    await untilTaskScheduled('user-visible', getCleanupSignal(onCleanup))
    // Center map to selected sprite if it's out of viewport
    if (selectedSprite != null && !inViewport(selectedSprite)) {
      const mapPosForSprite = {
        x: -(mapSize.value.width / 2 + selectedSprite.x - viewportSize.value.width / 2),
        y: -(mapSize.value.height / 2 - selectedSprite.y - viewportSize.value.height / 2)
      }
      await setMapPosWithTransition(mapPosForSprite, 300)
    }

    // Set camera follow sprite
    if (project.cameraFollowSprite !== selectedSprite) {
      project.history.doAction({ name: { en: 'Set camera follow', zh: '设置相机跟随' } }, () =>
        project.setCameraFollowSprite(selectedSprite?.id ?? null)
      )
    }
  },
  { immediate: true }
)

const mapConfig = computed(() => {
  return {
    ...mapPos.value,
    draggable: true,
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
  const backdropExists = editorCtx.project.stage.defaultBackdrop != null
  if (backdropExists && (backdropSrcLoading.value || !backdropImg.value)) return true
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
        x: newMapPos.x - oldMapPos.x,
        y: newMapPos.y - oldMapPos.y
      })
    }, interval)
  },
  100,
  {
    trailing: false // Ensure cameraEdgeScrollCheckTimer properly cleared in handleSpriteDragEnd
  }
)

// quick configor
const configTypesRef = ref<ConfigType[]>([])
function handleOpenConfigor() {
  const configType = configTypesRef.value
  configTypesRef.value = configType.length === 1 && configType[0] === 'default' ? [] : ['default']
}
function handleUpdateConfigType(configType: ConfigType) {
  configTypesRef.value = ['default', configType]
}

function handleSpriteDragEnd() {
  clearCameraEdgeScrollCheckTimer()
}

function handleSpriteSelected(sprite: Sprite) {
  editorCtx.state.selectSprite(sprite.id)
}

function handleWheel(e: KonvaEventObject<WheelEvent>) {
  const mpos = mapPos.value
  e.evt.preventDefault()
  setMapPos({
    x: mpos.x - e.evt.deltaX,
    y: mpos.y - e.evt.deltaY
  })
}

// TODO: implement a standalone screenshot taker which does not depend on StageViewer
// See details in https://github.com/goplus/builder/issues/1807 .
async function takeScreenshot(name: string, signal?: AbortSignal) {
  const stage = await untilNotNull(stageRef, signal)
  const nodeTransformer = await untilNotNull(nodeTransformerRef, signal)
  await until(() => !loading.value, signal)
  // Omit transform control when taking screenshot
  const blob = await nodeTransformer.withHidden(
    () =>
      stage.getStage().toBlob({
        mimeType: 'image/jpeg',
        // @ts-expect-error: field missing in type definition, see details in https://github.com/konvajs/konva/issues/1977
        imageSmoothingEnabled: false
      }) as Promise<Blob>
  )
  return fromBlob(`${name}.jpg`, blob)
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

  background-image: url(@/assets/images/stage-bg.svg);
  background-position: center;
  background-repeat: repeat;
  background-size: contain;
  position: relative;

  &:focus {
    outline: none;
  }
}

.quick-config {
  bottom: 48px;
  left: 50%;
}
</style>
