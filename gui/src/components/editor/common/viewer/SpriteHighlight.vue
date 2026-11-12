<script lang="ts">
type SpriteOutline = { canvas: HTMLCanvasElement; scale: number; padding: number }

// Share recent bitmaps across hover targets and component mounts, with a 16 MiB pixel budget.
const maxCachedPixels = 4 * 1024 * 1024
const outlineCache: {
  image: CanvasImageSource
  width: number
  height: number
  scale: number
  outline: SpriteOutline
}[] = []
</script>

<script setup lang="ts">
import { computed } from 'vue'
import type { ImageConfig } from 'konva/lib/shapes/Image'

const props = defineProps<{
  spriteConfig: ImageConfig
  mapScale: number
}>()

// Smooth the mask before expanding it so fine alpha noise does not become a jagged outline.
// Supersampling keeps both edges antialiased at a fixed screen thickness.
const outline = computed<SpriteOutline | null>(() => {
  const { image, width = 0, height = 0, scaleX = 1 } = props.spriteConfig
  const scale = Math.abs(scaleX) * props.mapScale
  if (image == null || width <= 0 || height <= 0 || scale <= 0) return null
  const cachedIndex = outlineCache.findIndex(
    (item) => item.image === image && item.width === width && item.height === height && item.scale === scale
  )
  if (cachedIndex >= 0) {
    const cached = outlineCache.splice(cachedIndex, 1)[0]
    outlineCache.push(cached)
    return cached.outline
  }
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
  drawSilhouette(4.5)
  ctx.globalCompositeOperation = 'source-in'
  ctx.fillStyle = '#999'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  // Split the 3 px stroke into 2 px of white and 1 px of gray.
  ctx.globalCompositeOperation = 'source-atop'
  drawSilhouette(3.5)
  ctx.globalCompositeOperation = 'destination-out'
  drawSilhouette(1.5)
  const result = { canvas, scale: scale * pixelRatio, padding: padding * pixelRatio }
  if (canvas.width * canvas.height <= maxCachedPixels) {
    outlineCache.push({ image, width, height, scale, outline: result })
    while (
      outlineCache.length > 8 ||
      outlineCache.reduce((pixels, item) => pixels + item.outline.canvas.width * item.outline.canvas.height, 0) >
        maxCachedPixels
    ) {
      outlineCache.shift()
    }
  }
  return result
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
