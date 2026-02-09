<script lang="ts" setup>
import { computed, onMounted, ref, watchEffect } from 'vue'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { Image, ImageConfig } from 'konva/lib/shapes/Image'
import type { Project } from '@/models/project'
import { LeftRight, RotationStyle, headingToLeftRight, leftRightToHeading } from '@/models/sprite'
import type { Size } from '@/models/common'
import { normalizeDegree, round, useAsyncComputedLegacy } from '@/utils/utils'
import { useFileImg } from '@/utils/file'
import { cancelBubble, getNodeId } from './common'
import type { SpriteLocalConfig } from './quick-config/utils'
import type { TransformOp } from './custom-transformer'
import type Konva from 'konva'

const props = defineProps<{
  localConfig: SpriteLocalConfig
  selected: boolean
  project: Project
  mapSize: Size
  nodeReadyMap: Map<string, boolean>
}>()

export type CameraScrollNotifyFn = (
  /** Delta of camera position (in game) change */
  delta: { x: number; y: number }
) => void

type ConfigGetter = {
  get x(): number
  get y(): number
  get rotationStyle(): RotationStyle
  get heading(): number
  get size(): number
  get visible(): boolean
}

const emit = defineEmits<{
  selected: []
  dragMove: [notifyCameraScroll: CameraScrollNotifyFn]
  dragEnd: []
  updateTransformOp: [op: TransformOp | null]
}>()

const nodeRef = ref<KonvaNodeInstance<Image>>()
const costume = computed(() => props.localConfig.defaultCostume)
const bitmapResolution = computed(() => costume.value?.bitmapResolution ?? 1)
const [image] = useFileImg(() => costume.value?.img)
const rawSize = useAsyncComputedLegacy(async () => costume.value?.getRawSize() ?? null)

const nodeId = computed(() => getNodeId(props.localConfig))

const snapshotRef = ref<ConfigGetter | null>(null)
const configGetter = computed(() => {
  if (snapshotRef.value != null) return snapshotRef.value
  return props.localConfig
})

watchEffect((onCleanup) => {
  props.nodeReadyMap.set(nodeId.value, image.value != null)
  onCleanup(() => props.nodeReadyMap.delete(nodeId.value))
})

onMounted(() => {
  // Fix wrong zIndex after renaming
  // TODO: get rid of warning when renaming:
  // ```
  // Konva warning: Node has no parent. zIndex parameter is ignored.
  // Konva warning: Unexpected value 2 for zIndex property. zIndex is just index of a node in children of its parent. Expected value is from 0 to 1.
  // ```
  const zIndex = props.project.zorder.indexOf(props.localConfig.id)
  if (zIndex >= 0) {
    nodeRef.value!.getNode().zIndex(zIndex)
  }
})

function updateLocalConfigByShape(node: Konva.Node) {
  if (!props.selected) return
  const localConfig = props.localConfig
  const { x: oldX, y: oldY, heading: oldHeading, size: oldSize } = configGetter.value
  const size = toSize(node)
  if (oldSize !== size) {
    localConfig.setSize(size)
    emit('updateTransformOp', 'scale')
  }
  const heading = toHeading(node)
  if (oldHeading !== heading && localConfig.rotationStyle === RotationStyle.Normal) {
    localConfig.setHeading(heading)
    emit('updateTransformOp', 'rotate')
  }
  // Sprite's pivot causes x or y to change when size or heading changes, so they need to be updated together
  const { x, y } = toPosition(node)
  if (oldX !== x || oldY !== y) {
    localConfig.setX(x)
    localConfig.setY(y)
  }
}

function syncLocalConfigByShape(node: Konva.Node) {
  const localConfig = props.localConfig
  localConfig.setSize(toSize(node))
  localConfig.setHeading(toHeading(node))
  const { x, y } = toPosition(node)
  localConfig.setX(x)
  localConfig.setY(y)

  localConfig.sync()
}

function handleDragMove(e: KonvaEventObject<unknown>) {
  cancelBubble(e)
  const localConfig = props.localConfig
  const { x, y } = toPosition(e.target)
  localConfig.setX(x)
  localConfig.setY(y)
  emit('updateTransformOp', 'move')

  emit('dragMove', (delta) => {
    // Adjust position if camera scrolled during dragging to keep the sprite visually unmoved
    e.target.x(e.target.x() - delta.x)
    e.target.y(e.target.y() - delta.y)
  })
}

function handleDragEnd(e: KonvaEventObject<TransformOp>) {
  cancelBubble(e)
  syncLocalConfigByShape(e.target)
  emit('dragEnd')
}

// Temporarily cache localConfig data at the start of transformation to prevent abnormal Konva.Node behavior caused by continuous data updates during the process.
function handleTransformStart() {
  snapshotRef.value = {
    x: props.localConfig.x,
    y: props.localConfig.y,
    heading: props.localConfig.heading,
    size: props.localConfig.size,
    visible: props.localConfig.visible,
    rotationStyle: props.localConfig.rotationStyle
  }
}
function handleTransform(e: KonvaEventObject<unknown>) {
  updateLocalConfigByShape(e.target)
}
function handleTransformEnd(e: KonvaEventObject<unknown>) {
  syncLocalConfigByShape(e.target)
  snapshotRef.value = null
}

const config = computed<ImageConfig>(() => {
  const { visible, x, y, rotationStyle, heading, size } = configGetter.value
  const scale = size / bitmapResolution.value
  const costumePivot = costume.value?.pivot ?? { x: 0, y: 0 }
  const config = {
    nodeId: nodeId.value,
    image: image.value ?? undefined,
    width: rawSize.value?.width ?? 0,
    height: rawSize.value?.height ?? 0,
    draggable: props.selected,
    offsetX: costumePivot.x * bitmapResolution.value,
    offsetY: costumePivot.y * bitmapResolution.value,
    visible: visible,
    x: props.mapSize.width / 2 + x,
    y: props.mapSize.height / 2 - y,
    rotation: normalizeDegree(heading - 90),
    scaleX: scale,
    scaleY: scale
  } satisfies ImageConfig
  if (rotationStyle === RotationStyle.LeftRight && headingToLeftRight(heading) === LeftRight.left) {
    config.rotation = leftRightToHeading(LeftRight.left) - 90 // -180
    // the image is already rotated with `rotation: -180`, so we adjust `scaleY` to flip it vertically
    config.scaleY = -config.scaleY
    // Note that you can get the same result with `ratation: 0, scaleX: -scaleX` here, but there will be problem
    // if the user then do transform with transformer. Konva transformer prefers to make `scaleX` positive.
  }
  return config
})

function toPosition(node: Konva.Node) {
  const { mapSize } = props
  const x = round(node.x() - mapSize.width / 2)
  const y = round(mapSize.height / 2 - node.y())
  return { x, y }
}
function toHeading(node: Konva.Node) {
  const { localConfig } = props
  let heading = localConfig.heading
  if (localConfig.rotationStyle === RotationStyle.Normal || localConfig.rotationStyle === RotationStyle.LeftRight) {
    heading = normalizeDegree(round(node.rotation() + 90))
  }
  return heading
}
function toSize(node: Konva.Node) {
  const size = round(Math.abs(node.scaleX()) * bitmapResolution.value, 2)
  return size
}

function handleClick() {
  emit('selected')
}
</script>

<template>
  <v-image
    ref="nodeRef"
    :config="config"
    @dragmove="handleDragMove"
    @dragend="handleDragEnd"
    @transformstart="handleTransformStart"
    @transform="handleTransform"
    @transformend="handleTransformEnd"
    @click="handleClick"
  />
</template>
