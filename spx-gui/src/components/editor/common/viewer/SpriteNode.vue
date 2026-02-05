<script lang="ts" setup>
import { computed, onMounted, ref, watchEffect } from 'vue'
import type { Stage } from 'konva/lib/Stage'
import type { Shape } from 'konva/lib/Shape'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { Image, ImageConfig } from 'konva/lib/shapes/Image'
import type { Project } from '@/models/project'
import { LeftRight, RotationStyle, headingToLeftRight, leftRightToHeading, type Sprite } from '@/models/sprite'
import type { Size } from '@/models/common'
import { normalizeDegree, round, useAsyncComputedLegacy } from '@/utils/utils'
import { useFileImg } from '@/utils/file'
import { cancelBubble, getNodeId } from './common'
import type { SpriteLocalConfig } from './quick-config/utils'
import type { NodeUpdateEvent, TransformOp } from './custom-transformer'

const props = defineProps<{
  sprite: Sprite
  localConfig: SpriteLocalConfig | null
  selected: boolean
  project: Project
  mapSize: Size
  nodeReadyMap: Map<string, boolean>
}>()

export type CameraScrollNotifyFn = (
  /** Delta of camera position (in game) change */
  delta: { x: number; y: number }
) => void

const emit = defineEmits<{
  selected: []
  dragMove: [notifyCameraScroll: CameraScrollNotifyFn]
  dragEnd: []
}>()

const nodeRef = ref<KonvaNodeInstance<Image>>()
const costume = computed(() => props.sprite.defaultCostume)
const bitmapResolution = computed(() => costume.value?.bitmapResolution ?? 1)
const [image] = useFileImg(() => costume.value?.img)
const rawSize = useAsyncComputedLegacy(async () => costume.value?.getRawSize() ?? null)

const nodeId = computed(() => getNodeId(props.sprite))

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
  const zIndex = props.project.zorder.indexOf(props.sprite.id)
  if (zIndex >= 0) {
    nodeRef.value!.getNode().zIndex(zIndex)
  }
})

function updateLocalConfig(
  {
    oldX,
    x,
    oldY,
    y,
    oldSize,
    size,
    oldHeading,
    heading
  }: {
    oldX: number
    x: number
    oldY: number
    y: number
    oldSize: number
    size: number
    oldHeading: number
    heading: number
  },
  op: TransformOp
) {
  const spriteLocalConfig = props.localConfig
  if (spriteLocalConfig == null) return
  if (size !== oldSize) {
    spriteLocalConfig.setSize(size, op === 'scale')
  }
  if (heading !== oldHeading) {
    spriteLocalConfig.setHeading(heading, op === 'rotate')
  }
  if (x !== oldX || y !== oldY) {
    spriteLocalConfig.setX(x, op === 'move')
    spriteLocalConfig.setY(y, op === 'move')
  }
}
function updateLocalConfigByShape(node: Shape | Stage, op: TransformOp) {
  if (!props.selected || props.localConfig == null) return
  const { x, y } = toPosition(node)
  updateLocalConfig(
    {
      oldX: props.sprite.x,
      x,
      oldY: props.sprite.y,
      y,
      oldSize: props.sprite.size,
      size: toSize(node),
      oldHeading: props.sprite.heading,
      heading: toHeading(node)
    },
    op
  )
}

function syncLocalConfig(
  { size, x, y, heading }: { size: number; x: number; y: number; heading: number },
  op: TransformOp
) {
  const spriteLocalConfig = props.localConfig
  if (spriteLocalConfig == null) return

  if (size != null && props.sprite.size !== size) {
    spriteLocalConfig.setSize(size, op === 'scale')
  }
  if (props.sprite.heading !== heading) {
    spriteLocalConfig.setHeading(heading, op === 'rotate')
  }
  if (props.sprite.x !== x || props.sprite.y !== y) {
    spriteLocalConfig.setX(x, op === 'move')
    spriteLocalConfig.setY(y, op === 'move')
  }

  spriteLocalConfig.syncAll()
}
function syncLocalConfigByShape(node: Shape | Stage, op: TransformOp) {
  syncLocalConfig(
    {
      size: toSize(node),
      x: toPosition(node).x,
      y: toPosition(node).y,
      heading: toHeading(node)
    },
    op
  )
}

function handleDragMove(e: KonvaEventObject<unknown>) {
  cancelBubble(e)
  updateLocalConfigByShape(e.target, 'move')
  emit('dragMove', (delta) => {
    // Adjust position if camera scrolled during dragging to keep the sprite visually unmoved
    e.target.x(e.target.x() - delta.x)
    e.target.y(e.target.y() - delta.y)
  })
}

function handleDragEnd(e: KonvaEventObject<TransformOp>) {
  cancelBubble(e)
  syncLocalConfigByShape(e.target, 'move')
  emit('dragEnd')
}

function handleNodeUpdating(e: KonvaEventObject<NodeUpdateEvent>) {
  updateLocalConfigByShape(e.target, e.evt.op)
}
function handleNodeUpdated(e: KonvaEventObject<NodeUpdateEvent>) {
  syncLocalConfigByShape(e.target, e.evt.op)
}

const config = computed<ImageConfig>(() => {
  const { visible, x, y, rotationStyle, heading, size } = props.sprite
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

function toPosition(node: Shape | Stage) {
  const { mapSize } = props
  const x = round(node.x() - mapSize.width / 2)
  const y = round(mapSize.height / 2 - node.y())
  return { x, y }
}
function toHeading(node: Shape | Stage) {
  const { sprite } = props
  let heading = sprite.heading
  if (sprite.rotationStyle === RotationStyle.Normal || sprite.rotationStyle === RotationStyle.LeftRight) {
    heading = normalizeDegree(round(node.rotation() + 90))
  }
  return heading
}
function toSize(node: Shape | Stage) {
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
    @nodeupdating="handleNodeUpdating"
    @nodeupdated="handleNodeUpdated"
    @click="handleClick"
  />
</template>
