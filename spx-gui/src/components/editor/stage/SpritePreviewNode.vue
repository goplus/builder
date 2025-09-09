<template>
  <v-image :config="config" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ImageConfig } from 'konva/lib/shapes/Image'
import type { Size } from '@/models/common'
import type { Sprite } from '@/models/sprite'
import { LeftRight, RotationStyle, headingToLeftRight, leftRightToHeading } from '@/models/sprite'
import { nomalizeDegree, useAsyncComputed } from '@/utils/utils'
import { useFileImg } from '@/utils/file'

const props = defineProps<{
  sprite: Sprite
  mapSize: Size
}>()

const costume = computed(() => props.sprite.defaultCostume)
const bitmapResolution = computed(() => costume.value?.bitmapResolution ?? 1)
const [image] = useFileImg(() => costume.value?.img)
const rawSize = useAsyncComputed(async () => costume.value?.getRawSize() ?? null)

const config = computed<ImageConfig>(() => {
  const { x, y, rotationStyle, heading, size, pivot, visible } = props.sprite
  const scale = size / bitmapResolution.value
  const width = rawSize.value?.width ?? 0
  const height = rawSize.value?.height ?? 0
  const cfg: ImageConfig = {
    image: image.value ?? undefined,
    width,
    height,
    draggable: false,
    listening: false,
    visible,
    x: props.mapSize.width / 2 + x,
    y: props.mapSize.height / 2 - y,
    rotation: nomalizeDegree(heading - 90),
    scaleX: scale,
    scaleY: scale
  }
  const c = costume.value
  if (c != null) {
    cfg.offsetX = c.x + pivot.x * c.bitmapResolution
    cfg.offsetY = c.y - pivot.y * c.bitmapResolution
  }
  if (rotationStyle === RotationStyle.leftRight && headingToLeftRight(heading) === LeftRight.left) {
    cfg.rotation = leftRightToHeading(LeftRight.left) - 90
    cfg.scaleY = -cfg.scaleY!
  }
  return cfg
})
</script>
