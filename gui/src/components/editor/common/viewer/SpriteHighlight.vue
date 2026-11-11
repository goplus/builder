<script setup lang="ts">
import { computed } from 'vue'
import type { ImageConfig } from 'konva/lib/shapes/Image'

const props = defineProps<{
  spriteConfig: ImageConfig
  mapScale: number
}>()

// Build the alpha silhouette at screen size to keep the outline thickness independent
// of sprite size, bitmap resolution and stage scale.
const outline = computed(() => {
  const { image, width = 0, height = 0, scaleX = 1 } = props.spriteConfig
  const scale = Math.abs(scaleX) * props.mapScale
  if (image == null || width <= 0 || height <= 0 || scale <= 0) return null
  const padding = 6
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(width * scale) + padding * 2
  canvas.height = Math.ceil(height * scale) + padding * 2
  const ctx = canvas.getContext('2d')
  if (ctx == null) return null
  const drawSilhouette = (radius: number) => {
    ctx.drawImage(image, padding, padding, width * scale, height * scale)
    for (let index = 0; index < 32; index++) {
      const angle = (index / 32) * Math.PI * 2
      ctx.drawImage(
        image,
        padding + Math.cos(angle) * radius,
        padding + Math.sin(angle) * radius,
        width * scale,
        height * scale
      )
    }
  }
  drawSilhouette(4)
  ctx.globalCompositeOperation = 'source-in'
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.globalCompositeOperation = 'destination-out'
  drawSilhouette(1.5)
  return { canvas, scale, padding }
})

const config = computed<ImageConfig | null>(() => {
  if (outline.value == null) return null
  const { canvas, scale, padding } = outline.value
  return {
    ...props.spriteConfig,
    nodeId: null,
    image: canvas,
    width: canvas.width / scale,
    height: canvas.height / scale,
    offsetX: (props.spriteConfig.offsetX ?? 0) + padding / scale,
    offsetY: (props.spriteConfig.offsetY ?? 0) + padding / scale,
    opacity: 0.7,
    listening: false,
    draggable: false
  }
})
</script>

<template>
  <v-image v-if="config != null" :config="config" />
</template>
