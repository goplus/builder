<script setup lang="ts">
import { ref } from 'vue'
import { getImgDrawingCtx } from '@/utils/canvas'
import { File } from '@/models/common/file'
import type { Costume } from '@/models/costume'
import { UIImg } from '../ui'

const props = defineProps<{
  placeholderImg?: string | null
}>()

type Frame = {
  img: HTMLImageElement
  width: number
  height: number
  x: number
  y: number
}

const canvasRef = ref<HTMLCanvasElement>()

async function loadImg(file: File, signal: AbortSignal) {
  const url = await file.url((f) => signal.addEventListener('abort', f))
  const img = new Image()
  img.src = url
  await img.decode().catch((e) => {
    // Sometimes `decode` fails, while the image is still able to be displayed
    console.warn('Failed to decode image', url, e)
  })
  return img
}

async function loadFrame(costume: Costume, signal: AbortSignal): Promise<Frame> {
  const [img, size] = await Promise.all([loadImg(costume.img, signal), costume.getSize()])
  const x = costume.x / costume.bitmapResolution
  const y = costume.y / costume.bitmapResolution
  return { img, x, y, ...size }
}

async function loadFrames(costumes: Costume[], signal: AbortSignal) {
  return Promise.all(costumes.map((costume) => loadFrame(costume, signal)))
}

const drawingOptionsRef = ref({
  scale: 1,
  offsetX: 0,
  offsetY: 0
})

function adjustDrawingOptions(canvas: HTMLCanvasElement, firstFrame: Frame) {
  const scale = Math.min(canvas.width / firstFrame.width, canvas.height / firstFrame.height)
  drawingOptionsRef.value = {
    scale,
    offsetX: (canvas.width - firstFrame.width * scale) / 2 + firstFrame.x * scale,
    offsetY: (canvas.height - firstFrame.height * scale) / 2 + firstFrame.y * scale
  }
}

function drawFrame(canvas: HTMLCanvasElement, frame: Frame) {
  const ctx = getImgDrawingCtx(canvas)
  const { scale, offsetX, offsetY } = drawingOptionsRef.value
  const x = offsetX - frame.x * scale
  const y = offsetY - frame.y * scale
  const width = frame.width * scale
  const height = frame.height * scale
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(frame.img, x, y, width, height)
}

function playFrames(frames: Frame[], duration: number, signal: AbortSignal) {
  const canvas = canvasRef.value
  if (canvas == null) return
  const dpr = window.devicePixelRatio
  canvas.width = Math.floor(canvas.clientWidth * dpr)
  canvas.height = Math.floor(canvas.clientHeight * dpr)
  if (frames.length === 0) return
  adjustDrawingOptions(canvas, frames[0])
  const interval = (duration * 1000) / frames.length
  let currIdx = 0
  drawFrame(canvas, frames[currIdx])
  const timer = setInterval(() => {
    currIdx = (currIdx + 1) % frames.length
    drawFrame(canvas, frames[currIdx])
  }, interval)
  signal.addEventListener('abort', () => clearInterval(timer))
}

type Loaded = {
  frames: Frame[]
  duration: number
}

const loadedRef = ref<Loaded | null>(null)

async function load(costumes: Costume[], duration: number, signal: AbortSignal) {
  const frames = await loadFrames(costumes, signal)
  signal.throwIfAborted()
  loadedRef.value = { frames, duration }
}

async function play(signal: AbortSignal) {
  if (loadedRef.value == null) throw new Error('not loaded yet')
  const { frames, duration } = loadedRef.value!
  playFrames(frames, duration, signal)
}

defineExpose({ load, play })
</script>

<template>
  <div class="frames-player">
    <canvas ref="canvasRef" class="canvas"></canvas>
    <UIImg
      v-show="props.placeholderImg != null && loadedRef == null"
      class="placeholder"
      :src="props.placeholderImg ?? null"
      loading
    />
  </div>
</template>

<style lang="scss" scoped>
.frames-player {
  position: relative;
}
.canvas,
.placeholder {
  position: absolute;
  width: 100%;
  height: 100%;
}
</style>
