<template>
  <v-image
    ref="nodeRef"
    :config="config"
    @dragend="handleDragEnd"
    @transformend="handleTransformed"
    @mousedown="handleMousedown"
  />
</template>
<script lang="ts" setup>
import { computed, onMounted, ref, watchEffect } from 'vue'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { Image, ImageConfig } from 'konva/lib/shapes/Image'
import type { Action } from '@/models/project'
import { LeftRight, RotationStyle, headingToLeftRight, leftRightToHeading, type Sprite } from '@/models/sprite'
import type { Size } from '@/models/common'
import { nomalizeDegree, round, useAsyncComputed } from '@/utils/utils'
import { useFileImgSmooth } from '@/utils/file'
import { useEditorCtx } from '../../EditorContextProvider.vue'
import { getNodeId } from './node'

const props = defineProps<{
  sprite: Sprite
  mapSize: Size
  nodeReadyMap: Map<string, boolean>
}>()

const nodeRef = ref<KonvaNodeInstance<Image>>()
const editorCtx = useEditorCtx()
const costume = computed(() => props.sprite.defaultCostume)
const bitmapResolution = computed(() => costume.value?.bitmapResolution ?? 1)
const [image] = useFileImgSmooth(() => costume.value?.img)
const rawSize = useAsyncComputed(async () => costume.value?.getRawSize() ?? null)

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
  const zIndex = editorCtx.project.zorder.indexOf(props.sprite.id)
  if (zIndex >= 0) {
    nodeRef.value!.getNode().zIndex(zIndex)
  }
})

function handleDragEnd(e: KonvaEventObject<unknown>) {
  const sname = props.sprite.name
  handleChange(e, {
    name: { en: `Move sprite ${sname}`, zh: `移动精灵 ${sname}` }
  })
}

function handleTransformed(e: KonvaEventObject<unknown>) {
  const sname = props.sprite.name
  handleChange(e, {
    name: { en: `Transform sprite ${sname}`, zh: `调整精灵 ${sname}` }
  })
}

const config = computed<ImageConfig>(() => {
  const { visible, x, y, rotationStyle, heading, size, pivot } = props.sprite
  const scale = size / bitmapResolution.value
  const config = {
    nodeId: nodeId.value,
    image: image.value ?? undefined,
    width: rawSize.value?.width ?? 0,
    height: rawSize.value?.height ?? 0,
    draggable: true,
    offsetX: 0,
    offsetY: 0,
    visible: visible,
    x: props.mapSize.width / 2 + x,
    y: props.mapSize.height / 2 - y,
    rotation: nomalizeDegree(heading - 90),
    scaleX: scale,
    scaleY: scale
  } satisfies ImageConfig
  const c = costume.value
  if (c != null) {
    config.offsetX = c.x + pivot.x * c.bitmapResolution
    config.offsetY = c.y - pivot.y * c.bitmapResolution
  }
  if (rotationStyle === RotationStyle.leftRight && headingToLeftRight(heading) === LeftRight.left) {
    config.rotation = leftRightToHeading(LeftRight.left) - 90 // -180
    // the image is already rotated with `rotation: -180`, so we adjust `scaleY` to flip it vertically
    config.scaleY = -config.scaleY
    // Note that you can get the same result with `ratation: 0, scaleX: -scaleX` here, but there will be problem
    // if the user then do transform with transformer. Konva transformer prefers to make `scaleX` positive.
  }
  return config
})

/** Handler for position-change (drag) or transform */
function handleChange(e: KonvaEventObject<unknown>, action: Action) {
  const { sprite, mapSize } = props
  const x = round(e.target.x() - mapSize.width / 2)
  const y = round(mapSize.height / 2 - e.target.y())
  let heading = sprite.heading
  if (sprite.rotationStyle === RotationStyle.normal || sprite.rotationStyle === RotationStyle.leftRight) {
    heading = nomalizeDegree(round(e.target.rotation() + 90))
  }
  const size = round(Math.abs(e.target.scaleX()) * bitmapResolution.value, 2)
  editorCtx.project.history.doAction(action, () => {
    sprite.setX(x)
    sprite.setY(y)
    sprite.setHeading(heading)
    sprite.setSize(size)
  })
}

function handleMousedown() {
  editorCtx.state.selectSprite(props.sprite.id)
}
</script>
