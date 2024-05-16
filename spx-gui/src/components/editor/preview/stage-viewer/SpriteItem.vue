<template>
  <v-image
    ref="nodeRef"
    :config="{
      spriteName: sprite.name,
      image: image,
      draggable: true,
      offsetX: costume?.x,
      offsetY: costume?.y,
      visible: sprite.visible,
      ...spx2Konva(sprite)
    }"
    @dragend="handleChange"
    @transformend="handleChange"
    @mousedown="handleMousedown"
  />
</template>
<script lang="ts" setup>
import { computed, defineProps, onMounted, ref, watchEffect } from 'vue'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { Sprite } from '@/models/sprite'
import type { Size } from '@/models/common'
import { useImgFile } from '@/utils/file'
import { useEditorCtx } from '../../EditorContextProvider.vue'
import { round } from '@/utils/utils'

const props = defineProps<{
  sprite: Sprite
  mapSize: Size
  spritesReadyMap: Map<string, boolean>
}>()

const nodeRef = ref<any>()
const editorCtx = useEditorCtx()
const costume = computed(() => props.sprite.costume)
const bitmapResolution = computed(() => costume.value?.bitmapResolution ?? 1)
const [image] = useImgFile(() => costume.value?.img)

watchEffect((onCleanup) => {
  const spriteName = props.sprite.name
  onCleanup(() => {
    props.spritesReadyMap.delete(spriteName)
  })
})

watchEffect((onCleanup) => {
  const spriteName = props.sprite.name

  const img = image.value
  if (img == null) {
    props.spritesReadyMap.set(spriteName, false)
    return
  }
  function handleImageLoad() {
    // We need to notify event ready for SpriteTransformer (to get correct node size)
    props.spritesReadyMap.set(spriteName, true)
  }
  img.addEventListener('load', handleImageLoad)
  onCleanup(() => img.removeEventListener('load', handleImageLoad))
})

onMounted(() => {
  // Fix wrong zIndex after renaming
  // TODO: get rid of warning when renaming:
  // ```
  // Konva warning: Node has no parent. zIndex parameter is ignored.
  // Konva warning: Unexpected value 2 for zIndex property. zIndex is just index of a node in children of its parent. Expected value is from 0 to 1.
  // ```
  const zIndex = editorCtx.project.zorder.indexOf(props.sprite.name)
  if (zIndex >= 0) {
    nodeRef.value!.getNode().zIndex(zIndex)
  }
})

/** Handler for position-change (drag) or transform */
function handleChange(e: KonvaEventObject<unknown>) {
  const { x, y, heading, size } = konva2Spx({
    x: e.target.x(),
    y: e.target.y(),
    rotation: e.target.rotation(),
    scaleX: e.target.scaleX(),
    scaleY: e.target.scaleY()
  })
  props.sprite.setX(x)
  props.sprite.setY(y)
  props.sprite.setHeading(heading)
  props.sprite.setSize(size)
}

function handleMousedown() {
  editorCtx.select('sprite', props.sprite.name)
}

type KonvaAttrs = {
  x: number
  y: number
  rotation: number
  scaleX: number
  scaleY: number
}

type SpxAttrs = {
  x: number
  y: number
  heading: number
  size: number
}

function konva2Spx({ x, y, rotation, scaleX }: KonvaAttrs): SpxAttrs {
  return {
    x: round(x - props.mapSize.width / 2),
    y: round(props.mapSize.height / 2 - y),
    heading: resolveDegree(round(rotation + 90)),
    size: round(scaleX * bitmapResolution.value, 2)
  }
}

function spx2Konva({ x, y, heading, size }: SpxAttrs): KonvaAttrs {
  const scale = size / bitmapResolution.value
  return {
    x: props.mapSize.width / 2 + x,
    y: props.mapSize.height / 2 - y,
    rotation: resolveDegree(heading - 90),
    scaleX: scale,
    scaleY: scale
  }
}

// to [-180, 180)
function resolveDegree(num: number) {
  if (!Number.isFinite(num) || Number.isNaN(num)) return num
  num = num % 360
  if (num >= 180) num = num - 360
  if (num < -180) num = num + 360
  return num
}
</script>
