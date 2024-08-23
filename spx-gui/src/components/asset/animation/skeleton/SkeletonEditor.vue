<template>
  <div class="container">
    <canvas ref="skeletonCanvas" class="skeleton-canvas" @mousedown="selectJoint"></canvas>
    <EditorGizmo
      v-model:position="currentPosition"
      v-model:active="dragActive"
      class="gizmo-layer"
    />
  </div>
</template>

<script lang="ts" setup>
import type { SkeletonAnimation } from '@/models/skeletonAnimation'
import type { Sprite } from '@/models/sprite'
import { onMounted, onUnmounted, ref, watch } from 'vue'
import EditorGizmo from './EditorGizmo.vue'

const skeletonCanvas = ref<HTMLCanvasElement | null>(null)

const props = defineProps<{
  sprite: Sprite
}>()

const currentPosition = ref({ x: 0, y: 0 })
const draggingJoint = ref<number | null>(null)
const dragActive = ref(false)

const joints = ref(props.sprite.skeletonAnimation?.joints)
const scale = 40

const render = () => {
  const canvas = skeletonCanvas.value!
  const { clientWidth, clientHeight } = canvas.parentElement!
  canvas.width = clientWidth
  canvas.height = clientHeight
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, clientWidth, clientHeight)
  renderJoints(ctx, joints.value)
}

onMounted(async () => {
  window.addEventListener('resize', render)
  render()
})

onUnmounted(() => {
  window.removeEventListener('resize', render)
})

const renderJoints = (ctx: CanvasRenderingContext2D, joints?: SkeletonAnimation['joints']) => {
  if (!joints) return
  joints.forEach((joint) => {
    const { pos, parent } = joint
    const { x, y } = toCanvasCoord(pos)
    const { x: parentX, y: parentY } = toCanvasCoord(joints[parent]?.pos ?? { x: 0, y: 0 })
    drawLine(ctx, x, y, parentX, parentY, 'black', 2)
  })
  joints.forEach((joint) => {
    const { pos } = joint
    const { x, y } = toCanvasCoord(pos)
    drawJoint(ctx, x, y, 5, 'red')
  })
}

const toCanvasCoord = ({ x, y }: { x: number; y: number }) => {
  const canvas = skeletonCanvas.value!
  const { clientWidth, clientHeight } = canvas.parentElement!
  return {
    x: x * scale + clientWidth / 2,
    y: y * scale + clientHeight / 2
  }
}

const drawLine = (
  ctx: CanvasRenderingContext2D,
  sX: number,
  sY: number,
  eX: number,
  eY: number,
  color: string,
  width: number
) => {
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

const drawJoint = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string
) => {
  ctx.save()
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()
  ctx.closePath()
  ctx.restore()
}

const getCloserJoint = (x: number, y: number) => {
  if (!joints.value) return -1
  const limit = 10
  return joints.value.findIndex((joint) => {
    const { pos } = joint
    const { x: jointX, y: jointY } = toCanvasCoord(pos)
    return Math.abs(jointX - x) < limit && Math.abs(jointY - y) < limit
  })
}

const selectJoint = (e: MouseEvent) => {
  const { offsetX, offsetY } = e
  const joint = getCloserJoint(offsetX, offsetY)
  if (joint !== -1) {
    draggingJoint.value = joint
    currentPosition.value = toCanvasCoord(joints.value![joint].pos)
    lastPosition.x = currentPosition.value.x
    lastPosition.y = currentPosition.value.y
    dragActive.value = true
  }
}

let lastPosition = { x: 0, y: 0 }
watch(
  () => [currentPosition.value.x, currentPosition.value.y],
  () => {
    if (draggingJoint.value !== null) {
      const joint = joints.value![draggingJoint.value]
      joint.pos.x = (currentPosition.value.x - skeletonCanvas.value!.width / 2) / scale
      joint.pos.y = (currentPosition.value.y - skeletonCanvas.value!.height / 2) / scale
      render()
    }
  }
)
</script>

<style scoped>
.container {
  display: flex;
  justify-content: center;
  align-items: stretch;
  flex-direction: row;
  height: 0;
  flex: 1;
  width: 100%;
  position: relative;
  background-color: #ffffff;
}

.gizmo-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: transparent;
}
</style>
