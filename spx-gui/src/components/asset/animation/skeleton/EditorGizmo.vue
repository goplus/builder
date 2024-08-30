<template>
  <div
    class="container"
    :style="{
      cursor: cursorMap[hoverHandler],
      opacity: active ? 1 : 0,
      pointerEvents: active ? 'auto' : 'none'
    }"
  >
    <canvas ref="canvas" @mousedown="handleMouseDown" />
  </div>
</template>
<script lang="ts" setup>
import { watch } from 'vue'
import { computed, onMounted, onUnmounted, ref, type Ref } from 'vue'
type Pos2D = { x: number; y: number }
type Vec2D = Pos2D
type Handler = 'horizontal' | 'vertical' | 'free' | 'none'
const cursorMap = {
  horizontal: 'ew-resize',
  vertical: 'ns-resize',
  free: 'move',
  none: 'unset'
}

const position = defineModel('position', {
  type: Object as () => Pos2D,
  default: { x: 0, y: 0 }
})

const active = defineModel('active', {
  type: Boolean,
  default: false
})

const canvas: Ref<HTMLCanvasElement | null> = ref(null)
let ctx: CanvasRenderingContext2D
let canvasWidth = 0
let canvasHeight = 0

const dragging = ref(false)
const dragStart = ref<Pos2D>({ x: 0, y: 0 })

const draggingHandler = ref<Handler>('none')
const hoverHandler = ref<Handler>('none')

const RING_SIZE = 14
const ARROW_SIZE = 64
const VERTICAL_HANDLER_COLOR = '#2196f3aa'
const VERTICAL_HANDLER_COLOR_HOVER = '#2196f3'
const VERTICAL_INDICATOR_COLOR = '#2196f377'
const HORIZONTAL_HANDLER_COLOR = '#f44336aa'
const HORIZONTAL_HANDLER_COLOR_HOVER = '#f44336'
const HORIZONTAL_INDICATOR_COLOR = '#f4433677'
const FREE_HANDLER_SIZE = 10
const FREE_HANDLER_COLOR = '#0BC0CFaa'
const FREE_HANDLER_BORDER_COLOR = '#0BC0CF'
const FREE_HANDLER_COLOR_HOVER = '#0BC0CF'

const freeHandlerPosition = computed<Pos2D>(() => {
  return {
    x: position.value.x + (ARROW_SIZE - RING_SIZE) * 0.707,
    y: position.value.y - (ARROW_SIZE - RING_SIZE) * 0.707
  }
})

const initCanvas = () => {
  if (!canvas.value) return
  const { clientWidth, clientHeight } = canvas.value.parentElement!
  canvas.value.width = clientWidth
  canvas.value.height = clientHeight
  ctx = canvas.value.getContext('2d')!
  canvasWidth = clientWidth
  canvasHeight = clientHeight
  render()
}

const render = () => {
  if (!canvas.value) return
  ctx.clearRect(0, 0, canvasWidth, canvasHeight)
  renderGizmo()
}

watch([active], () => {
  render()
  handleMouseDown({ offsetX: position.value.x, offsetY: position.value.y } as MouseEvent)
})

onMounted(async () => {
  window.addEventListener('resize', initCanvas)
  initCanvas()
})

onUnmounted(() => {
  window.removeEventListener('resize', initCanvas)
})

/**
 * Area is represented by 4 points in clockwise or counter-clockwise order
 */
type Area = [Pos2D, Pos2D, Pos2D, Pos2D]

const verticalHandlerReactiveArea = computed(
  () =>
    [
      { x: position.value.x - RING_SIZE, y: position.value.y - RING_SIZE - ARROW_SIZE }, // left top
      { x: position.value.x + RING_SIZE, y: position.value.y - RING_SIZE - ARROW_SIZE }, // right top
      { x: position.value.x + RING_SIZE, y: position.value.y - RING_SIZE + 5 }, // right bottom
      { x: position.value.x - RING_SIZE, y: position.value.y - RING_SIZE + 5 } // left bottom
    ] as Area
)

const horizontalHandlerReactiveArea = computed(
  () =>
    [
      { x: position.value.x + RING_SIZE + ARROW_SIZE, y: position.value.y - RING_SIZE }, // right top
      { x: position.value.x + RING_SIZE + ARROW_SIZE, y: position.value.y + RING_SIZE }, // right bottom
      { x: position.value.x + RING_SIZE - 5, y: position.value.y + RING_SIZE }, // left bottom
      { x: position.value.x + RING_SIZE - 5, y: position.value.y - RING_SIZE } // left top
    ] as Area
)

const freeHandlerReactiveArea = computed(
  () =>
    [
      { x: position.value.x - RING_SIZE, y: position.value.y - ARROW_SIZE * 0.707 }, // left top
      { x: position.value.x + ARROW_SIZE * 0.707, y: position.value.y - ARROW_SIZE * 0.707 }, // right top
      { x: position.value.x + ARROW_SIZE * 0.707, y: position.value.y + RING_SIZE }, // right bottom
      { x: position.value.x - RING_SIZE, y: position.value.y + RING_SIZE } // left bottom
    ] as Area
)

function cross(a: Vec2D, b: Vec2D): number {
  return a.x * b.y - a.y * b.x
}

const vec = (a: Pos2D, b: Pos2D): Vec2D => {
  return { x: b.x - a.x, y: b.y - a.y }
}

const isInArea = (point: Pos2D, area: Area) => {
  const [a, b, c, d] = area
  const vecAB = vec(a, b)
  const vecAD = vec(a, d)
  const vecCB = vec(c, b)
  const vecCD = vec(c, d)
  const vecAP = vec(a, point)
  const vecCP = vec(c, point)

  const isSameSide = (vec1: Vec2D, vec2: Vec2D, vecP: Vec2D) =>
    Math.sign(cross(vec1, vecP)) === Math.sign(cross(vec1, vec2))

  const isInBAD = isSameSide(vecAB, vecAD, vecAP) && isSameSide(vecAD, vecAB, vecAP)
  const isInDCB = isSameSide(vecCD, vecCB, vecCP) && isSameSide(vecCB, vecCD, vecCP)
  return isInBAD && isInDCB
}

const renderGizmo = () => {
  drawRingAt(position.value.x, position.value.y, RING_SIZE, RING_SIZE - 2, '#0BC0CF')
  drawRingAt(position.value.x, position.value.y, 6, 0, '#FF9E2C')
  renderHandler()
}

const drawRingAt = (
  x: number,
  y: number,
  outerRadius: number,
  innerRadius: number,
  color: string
) => {
  ctx.save()
  ctx.beginPath()
  ctx.arc(x, y, outerRadius, 0, Math.PI * 2)
  ctx.arc(x, y, innerRadius, 0, Math.PI * 2, true)
  ctx.fillStyle = color
  ctx.fill()
  ctx.closePath()
  ctx.restore()
}

const renderHandler = () => {
  const drawAll =
    !dragging.value || draggingHandler.value === 'none' || draggingHandler.value === 'free'
  const drawHorizontal = drawAll || draggingHandler.value === 'horizontal'
  const drawVertical = drawAll || draggingHandler.value === 'vertical'
  const drawFree = drawAll
  if (drawHorizontal) {
    drawArrow(
      position.value.x + RING_SIZE,
      position.value.y,
      position.value.x + RING_SIZE + ARROW_SIZE,
      position.value.y,
      RING_SIZE * 0.8,
      RING_SIZE * 1.5,
      2,
      hoverHandler.value === 'horizontal'
        ? HORIZONTAL_HANDLER_COLOR_HOVER
        : HORIZONTAL_HANDLER_COLOR
    )
    // draw a line through the arrow
    if (!drawAll) {
      drawLine(0, position.value.y, canvasWidth, position.value.y, 2, HORIZONTAL_INDICATOR_COLOR)
    }
  }
  if (drawVertical) {
    drawArrow(
      position.value.x,
      position.value.y - RING_SIZE,
      position.value.x,
      position.value.y - RING_SIZE - ARROW_SIZE,
      RING_SIZE * 0.8,
      RING_SIZE * 1.5,
      2,
      hoverHandler.value === 'vertical' ? VERTICAL_HANDLER_COLOR_HOVER : VERTICAL_HANDLER_COLOR
    )
    // draw a line through the arrow
    if (!drawAll) {
      drawLine(position.value.x, 0, position.value.x, canvasHeight, 2, VERTICAL_INDICATOR_COLOR)
    }
  }
  if (drawFree) {
    drawRectWithBorder(
      freeHandlerPosition.value.x - FREE_HANDLER_SIZE / 2,
      freeHandlerPosition.value.y - FREE_HANDLER_SIZE / 2,
      FREE_HANDLER_SIZE,
      FREE_HANDLER_SIZE,
      hoverHandler.value === 'free' ? FREE_HANDLER_COLOR_HOVER : FREE_HANDLER_COLOR,
      FREE_HANDLER_BORDER_COLOR
    )
  }
}

const drawRectWithBorder = (
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  border?: string
) => {
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, width, height)
  ctx.fillStyle = color
  ctx.fill()
  ctx.strokeStyle = border || color
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.closePath()
  ctx.restore()
}

const drawLine = (sX: number, sY: number, eX: number, eY: number, width: number, color: string) => {
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(sX, sY)
  ctx.lineTo(eX, eY)
  ctx.lineWidth = width
  ctx.strokeStyle = color
  ctx.stroke()
  ctx.closePath()
  ctx.restore()
}

const drawArrow = (
  sX: number,
  sY: number,
  eX: number,
  eY: number,
  headWidth: number,
  headHeight: number,
  bodyWidth: number,
  color: string
) => {
  const vecSE = { x: eX - sX, y: eY - sY }
  const dstSE = Math.hypot(vecSE.x, vecSE.y)
  const uVecSE = { x: vecSE.x / dstSE, y: vecSE.y / dstSE }
  const vecSP = { x: uVecSE.x * (dstSE - headHeight), y: uVecSE.y * (dstSE - headHeight) }
  const vecPL = { x: (-uVecSE.y * headWidth) / 2, y: (uVecSE.x * headWidth) / 2 }
  const vecPR = { x: (uVecSE.y * headWidth) / 2, y: (-uVecSE.x * headWidth) / 2 }
  const pointL = { x: vecSP.x + vecPL.x + sX, y: vecSP.y + vecPL.y + sY }
  const pointR = { x: vecSP.x + vecPR.x + sX, y: vecSP.y + vecPR.y + sY }
  const head = [{ x: eX, y: eY }, pointL, pointR]

  drawPolygon({ points: head, color })
  drawLine(sX, sY, sX + vecSP.x, sY + vecSP.y, bodyWidth, color)
}

const drawPolygon = ({ points, color }: { points: { x: number; y: number }[]; color: string }) => {
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y)
  }
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
  ctx.restore()
}

const handleMouseDown = (e: MouseEvent) => {
  const { offsetX, offsetY } = e
  const areas = [
    { area: verticalHandlerReactiveArea.value, handler: 'vertical' },
    { area: horizontalHandlerReactiveArea.value, handler: 'horizontal' },
    { area: freeHandlerReactiveArea.value, handler: 'free' }
  ] as const

  for (const { area, handler } of areas) {
    if (isInArea({ x: offsetX, y: offsetY }, area)) {
      dragging.value = true
      dragStart.value = { x: offsetX, y: offsetY }
      draggingHandler.value = handler
      hoverHandler.value = handler
      return
    }
  }

  dragging.value = false
  active.value = false
}

const handleMouseMove = (e: MouseEvent) => {
  const { movementX, movementY, offsetX, offsetY } = e
  if (dragging.value) {
    const targetX = Math.max(0, Math.min(canvasWidth, position.value.x + movementX))
    const targetY = Math.max(0, Math.min(canvasHeight, position.value.y + movementY))

    if (['vertical', 'free'].includes(draggingHandler.value)) {
      position.value.y = targetY
    }
    if (['horizontal', 'free'].includes(draggingHandler.value)) {
      position.value.x = targetX
    }
    render()
    return
  }
  if (e.target === ctx.canvas) {
    const savedHoverHandler = hoverHandler.value
    const areas = [
      { area: verticalHandlerReactiveArea.value, handler: 'vertical' },
      { area: horizontalHandlerReactiveArea.value, handler: 'horizontal' },
      { area: freeHandlerReactiveArea.value, handler: 'free' }
    ] as const

    hoverHandler.value = 'none'
    for (const { area, handler } of areas) {
      if (isInArea({ x: offsetX, y: offsetY }, area)) {
        hoverHandler.value = handler
        break
      }
    }

    if (savedHoverHandler !== hoverHandler.value) {
      render()
    }
  }
}

const handleMouseUp = () => {
  dragging.value = false
  draggingHandler.value = 'none'
  hoverHandler.value = 'none'
}

onMounted(() => {
  window.document.addEventListener('mousemove', handleMouseMove)
  window.document.addEventListener('mouseup', handleMouseUp)
})

onUnmounted(() => {
  window.document.removeEventListener('mousemove', handleMouseMove)
  window.document.removeEventListener('mouseup', handleMouseUp)
})
</script>

<style scoped>
.container {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  height: 100%;
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--color-theme-1);
  position: relative;
  background-color: transparent;
}

canvas {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  background: transparent;
}
</style>
