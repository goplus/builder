<script lang="ts" setup>
import { computed } from 'vue'
import type { ImageConfig } from 'konva/lib/shapes/Image'
import type { Size } from '@/models/common'
import type { Decorator } from '@/models/tilemap'
import { normalizeDegree } from '@/utils/utils'
import { useFileImg } from '@/utils/file'

const props = defineProps<{
  decorator: Decorator
  mapSize: Size
}>()

// TODO: loading (ready) state for decorator?

const [image] = useFileImg(() => props.decorator.img)

const config = computed<ImageConfig>(() => {
  const { position, rotation, scale, pivot } = props.decorator
  return {
    image: image.value ?? undefined,
    draggable: false,
    offsetX: pivot.x,
    offsetY: pivot.y,
    x: props.mapSize.width / 2 + position.x,
    y: props.mapSize.height / 2 - position.y,
    rotation: normalizeDegree(rotation - 90),
    scaleX: scale.x,
    scaleY: scale.y
  } satisfies ImageConfig
})
</script>

<template>
  <v-image :config="config" />
</template>
