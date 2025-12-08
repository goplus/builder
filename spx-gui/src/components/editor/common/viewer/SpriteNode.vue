<script lang="ts" setup>
import { computed, onMounted, ref, watchEffect } from 'vue'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { Image, ImageConfig } from 'konva/lib/shapes/Image'
import type { Action, Project } from '@/models/project'
import { LeftRight, RotationStyle, headingToLeftRight, leftRightToHeading, type Sprite } from '@/models/sprite'
import type { Size } from '@/models/common'
import { nomalizeDegree, round, useAsyncComputedLegacy } from '@/utils/utils'
import { useFileImg } from '@/utils/file'
import { cancelBubble, getNodeId } from './common'
import type { ConfigType } from './quick-config/SpriteQuickConfig.vue'
import { throttle } from 'lodash'

const props = defineProps<{
  sprite: Sprite
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
  openConfigor: [type: ConfigType]
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

function handleDragMove(e: KonvaEventObject<unknown>) {
  cancelBubble(e)
  notifyConfigorOnSpriteChange(e)
  emit('dragMove', (delta) => {
    // Adjust position if camera scrolled during dragging to keep the sprite visually unmoved
    e.target.x(e.target.x() - delta.x)
    e.target.y(e.target.y() - delta.y)
  })
}

function handleDragEnd(e: KonvaEventObject<unknown>) {
  cancelBubble(e)
  const sname = props.sprite.name
  handleChange(e, {
    name: { en: `Move sprite ${sname}`, zh: `移动精灵 ${sname}` }
  })
  emit('dragEnd')
}

const notifyConfigorOnSpriteChange = throttle((e: KonvaEventObject<unknown>) => {
  if (!props.selected) return

  const { sprite } = props

  const size = toSize(e)
  if (size != sprite.size) {
    emit('openConfigor', 'size')
  }

  const { x, y } = toPosition(e)
  if (sprite.x !== x || sprite.y !== y) {
    emit('openConfigor', 'pos')
  }

  const heading = toHeading(e)
  if (sprite.heading !== heading) {
    emit('openConfigor', 'heading')
  }
}, 200)

function handleTransformed(e: KonvaEventObject<unknown>) {
  const sname = props.sprite.name
  notifyConfigorOnSpriteChange(e)
  handleChange(e, {
    name: { en: `Transform sprite ${sname}`, zh: `调整精灵 ${sname}` }
  })
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
    rotation: nomalizeDegree(heading - 90),
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

function toPosition(e: KonvaEventObject<unknown>) {
  const { mapSize } = props
  const x = round(e.target.x() - mapSize.width / 2)
  const y = round(mapSize.height / 2 - e.target.y())
  return { x, y }
}
function toHeading(e: KonvaEventObject<unknown>) {
  const { sprite } = props
  let heading = sprite.heading
  if (sprite.rotationStyle === RotationStyle.Normal || sprite.rotationStyle === RotationStyle.LeftRight) {
    heading = nomalizeDegree(round(e.target.rotation() + 90))
  }
  return heading
}
function toSize(e: KonvaEventObject<unknown>) {
  const size = round(Math.abs(e.target.scaleX()) * bitmapResolution.value, 2)
  return size
}
/** Handler for position-change (drag) or transform */
function handleChange(e: KonvaEventObject<unknown>, action: Action) {
  const { sprite } = props
  const { x, y } = toPosition(e)
  const heading = toHeading(e)
  const size = toSize(e)
  props.project.history.doAction(action, () => {
    sprite.setX(x)
    sprite.setY(y)
    sprite.setHeading(heading)
    sprite.setSize(size)
  })
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
    @transform="notifyConfigorOnSpriteChange"
    @transformend="handleTransformed"
    @click="handleClick"
    @open-configor="emit('openConfigor', 'default')"
  />
</template>
