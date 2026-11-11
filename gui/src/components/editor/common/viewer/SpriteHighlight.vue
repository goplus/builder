<script setup lang="ts">
import { computed } from 'vue'
import type { ImageConfig } from 'konva/lib/shapes/Image'

const props = defineProps<{
  spriteConfig: ImageConfig
  mapScale: number
}>()

// Smooth the mask before expanding it so fine alpha noise does not become a jagged outline.
// Supersampling keeps both edges antialiased at a fixed screen thickness.
const outline = computed(() => {
  const { image, width = 0, height = 0, scaleX = 1 } = props.spriteConfig
  const scale = Math.abs(scaleX) * props.mapScale
  if (image == null || width <= 0 || height <= 0 || scale <= 0) return null
  const pixelRatio = 2
  const padding = 6
  const canvas = document.createElement('canvas')
  canvas.width = (Math.ceil(width * scale) + padding * 2) * pixelRatio
  canvas.height = (Math.ceil(height * scale) + padding * 2) * pixelRatio
  const ctx = canvas.getContext('2d')
  if (ctx == null) return null

  const mask = document.createElement('canvas')
  mask.width = canvas.width
  mask.height = canvas.height
  const maskCtx = mask.getContext('2d', { willReadFrequently: true })
  if (maskCtx == null) return null
  // An off-canvas source leaves only its blurred alpha shadow; unlike canvas filters,
  // shadowBlur is supported by all our target browsers.
  maskCtx.shadowColor = '#fff'
  maskCtx.shadowBlur = 2 * pixelRatio
  maskCtx.shadowOffsetX = canvas.width
  maskCtx.drawImage(
    image,
    padding * pixelRatio - canvas.width,
    padding * pixelRatio,
    width * scale * pixelRatio,
    height * scale * pixelRatio
  )
  const maskData = maskCtx.getImageData(0, 0, mask.width, mask.height)
  let maxAlpha = 0
  for (let index = 3; index < maskData.data.length; index += 4) {
    maxAlpha = Math.max(maxAlpha, maskData.data[index])
  }
  if (maxAlpha === 0) return null
  for (let index = 3; index < maskData.data.length; index += 4) {
    const alpha = Math.min(1, Math.max(0, (maskData.data[index] / maxAlpha - 0.35) / 0.3))
    maskData.data[index] = Math.round(alpha * alpha * (3 - 2 * alpha) * 255)
  }
  maskCtx.putImageData(maskData, 0, 0)

  const drawSilhouette = (radius: number) => {
    ctx.drawImage(mask, 0, 0)
    for (let index = 0; index < 32; index++) {
      const angle = (index / 32) * Math.PI * 2
      ctx.drawImage(mask, Math.cos(angle) * radius * pixelRatio, Math.sin(angle) * radius * pixelRatio)
    }
  }
  drawSilhouette(4)
  ctx.globalCompositeOperation = 'source-in'
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.globalCompositeOperation = 'destination-out'
  drawSilhouette(1.5)
  return { canvas, scale: scale * pixelRatio, padding: padding * pixelRatio }
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
