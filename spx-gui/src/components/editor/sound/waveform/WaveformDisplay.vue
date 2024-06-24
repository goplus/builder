<template>
  <canvas ref="canvas"></canvas>
</template>
<script setup lang="ts">
import { useUIVariables } from '@/components/ui'
import { onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps<{
  points: number[]
  scale: number
  drawPaddingRight?: number
}>()

const canvas = ref<HTMLCanvasElement | null>(null)

const uiVariables = useUIVariables()

const setupCanvas = () => {
  if (!canvas.value) return

  const dpr = window.devicePixelRatio || 1
  const rect = canvas.value.getBoundingClientRect()

  canvas.value.width = rect.width * dpr
  canvas.value.height = rect.height * dpr

  draw()
}

onMounted(() => {
  if (!canvas.value) throw new Error('Canvas element not found')
  setupCanvas()

  const observer = new ResizeObserver(() => {
    setupCanvas()
  })
  observer.observe(canvas.value)

  onUnmounted(() => {
    observer.disconnect()
  })
})

const drawSmoothCurve = (ctx: CanvasRenderingContext2D, points: number[], flip = false) => {
  const halfHeight = ctx.canvas.height / 2
  const paddedWidth = ctx.canvas.width * (1 - (props.drawPaddingRight || 0))
  const segmentLength = paddedWidth / (points.length - 1)

  const getPoint = (i: number) => {
    if (flip) {
      return halfHeight - points[i] * halfHeight * props.scale
    }
    return halfHeight + points[i] * halfHeight * props.scale
  }

  ctx.beginPath()
  ctx.moveTo(0, halfHeight)

  for (let i = 0; i < points.length - 2; i++) {
    const currentOffsetX = i / points.length
    const xc = (i * segmentLength + (i + 1) * segmentLength) / 2 + currentOffsetX
    const yc = (getPoint(i) + getPoint(i + 1)) / 2
    ctx.quadraticCurveTo(i * segmentLength + currentOffsetX, getPoint(i), xc, yc)
  }

  ctx.quadraticCurveTo(
    (points.length - 2) * segmentLength,
    getPoint(points.length - 2),
    paddedWidth,
    getPoint(points.length - 1)
  )

  ctx.lineTo(ctx.canvas.width, getPoint(points.length - 1))
  ctx.lineTo(ctx.canvas.width, halfHeight)

  ctx.strokeStyle = uiVariables.color.sound[400]
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.closePath()
  ctx.fillStyle = uiVariables.color.sound[400]
  ctx.fill()
}

const draw = () => {
  if (canvas.value) {
    const ctx = canvas.value.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
      drawSmoothCurve(ctx, props.points)
      drawSmoothCurve(ctx, props.points, true)
    }
  }
}

watch(() => [props.points, props.points.length, props.scale], draw)
</script>
