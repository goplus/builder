<template>
  <div ref="container" class="container repaint-container">
    <canvas
      ref="drawCanvas"
      class="canvas draw-canvas"
      @mousedown="startDraw"
      @mousemove="drawing"
    ></canvas>
    <canvas ref="imageCanvas" class="canvas image-canvas"></canvas>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted, ref } from 'vue'

const props = defineProps<{
  imageSrc: string
}>()

const container = ref<HTMLDivElement | null>(null)
const drawCanvas = ref<HTMLCanvasElement | null>(null)
const imageCanvas = ref<HTMLCanvasElement | null>(null)

let drawCtx: CanvasRenderingContext2D
let imageCtx: CanvasRenderingContext2D

const resizeCanvas = () => {
  if (!container.value || !drawCanvas.value || !imageCanvas.value) return
  // save and restore the canvas content
  const drawData = drawCtx.canvas.toDataURL()
  const drawImg = new Image()
  drawImg.src = drawData

  const { width, height } = container.value.getBoundingClientRect()
  drawCanvas.value.width = width
  drawCanvas.value.height = height
  imageCanvas.value.width = width
  imageCanvas.value.height = height
  drawImage(props.imageSrc)

  drawImg.onload = () => {
    setTimeout(() => {
      drawCtx.drawImage(drawImg, 0, 0, drawCtx.canvas.width, drawCtx.canvas.height)
    }, 0)
  }
}

const drawImage = (src: string) => {
  const image = new Image()
  image.src = src
  image.onload = () => {
    const { width: imgWidth, height: imgHeight } = image
    // scale to fit the canvas
    const { width: canvasWidth, height: canvasHeight } = imageCtx.canvas
    const scale = Math.min(canvasWidth / imgWidth, canvasHeight / imgHeight)
    // resize both canvas to fit the image
    imageCtx.canvas.width = imgWidth * scale
    imageCtx.canvas.height = imgHeight * scale
    drawCtx.canvas.width = imgWidth * scale
    drawCtx.canvas.height = imgHeight * scale
    imageCtx.drawImage(image, 0, 0, imgWidth, imgHeight, 0, 0, imgWidth * scale, imgHeight * scale)
  }
}

const brushSize = 16
const brushColor = '#EF4149'
let isDrawing = false

const startDraw = (e: MouseEvent) => {
  if (!drawCtx) return
  drawCtx.beginPath()
  drawCtx.moveTo(e.offsetX, e.offsetY)
  isDrawing = true
}

const drawing = (e: MouseEvent) => {
  if (!drawCtx || !isDrawing) return
  drawCtx.lineTo(e.offsetX, e.offsetY)
  drawCtx.lineCap = 'round'
  drawCtx.lineJoin = 'round'
  drawCtx.lineWidth = brushSize
  drawCtx.strokeStyle = brushColor
  drawCtx.stroke()
}

const endDraw = () => {
  if (!drawCtx || !isDrawing) return
  isDrawing = false
  drawCtx.closePath()
}

onMounted(() => {
  if (!container.value || !drawCanvas.value || !imageCanvas.value) return
  drawCtx = drawCanvas.value.getContext('2d') as CanvasRenderingContext2D
  imageCtx = imageCanvas.value.getContext('2d') as CanvasRenderingContext2D
  resizeCanvas()
  drawImage(props.imageSrc)
  window.addEventListener('resize', resizeCanvas)
  document.addEventListener('mouseup', endDraw)
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas)
  document.removeEventListener('mouseup', endDraw)
})

const exportMaskedImage = async () => {
  if (!drawCanvas.value || !imageCanvas.value) return
  console.log('exporting masked image')
  const tempCanvas = document.createElement('canvas')
  const baseImg = new Image()
  baseImg.src = props.imageSrc
  const drawImg = new Image()
  drawImg.src = drawCanvas.value.toDataURL()
  await asyncOnload(baseImg)
  await asyncOnload(drawImg)
  tempCanvas.width = baseImg.width
  tempCanvas.height = baseImg.height
  const tempCtx = tempCanvas.getContext('2d') as CanvasRenderingContext2D
  tempCtx.drawImage(baseImg, 0, 0)
  // clear the alpha channel
  tempCtx.globalCompositeOperation = 'destination-out'
  tempCtx.drawImage(drawImg, 0, 0, baseImg.width, baseImg.height)
  tempCtx.globalCompositeOperation = 'source-over'
  return tempCanvas.toDataURL()
// download the image
//   const a = document.createElement('a')
//   a.href = tempCanvas.toDataURL()
//   a.download = 'maskedImage.png'
//   a.click()
}

const asyncOnload = (img: HTMLImageElement) => {
  return new Promise<void>((resolve) => {
	img.onload = () => resolve()
  })
}
</script>

<style scoped>
.repaint-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.canvas {
  position: absolute;
}

.draw-canvas {
  z-index: 100;
  opacity: 0.6;
}

.image-canvas {
  z-index: 1;
}
</style>
