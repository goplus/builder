<template>
  <div
    class="container"
    :style="{
      cursor: (hoverJoint !== null) ? 'move' : 'unset'
    }"
    @mousedown="selectJoint"
    @mousemove="handleMousemove"
  >
    <SkeletonAnimationRenderer
      v-if="skeletonTextures?.url.value && idleAnim"
      :data="idleAnim"
      :texture="skeletonTextures.url.value"
      :fps="30"
      :autoplay="false"
      class="texture-layer"
      @ready="
        (renderer) => {
          renderer.frameIndex = 0
        }
      "
    />
    <canvas ref="skeletonCanvas" class="skeleton-canvas"></canvas>
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
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import EditorGizmo from './EditorGizmo.vue'
import SkeletonAnimationRenderer from './SkeletonAnimationRenderer.vue'
import { useAsyncComputed } from '@/utils/utils'
import { useFileUrl } from '@/utils/file'

const JOINT_COLOR = '#219ffc'
const JOINT_HOVER_COLOR = '#0BC0CF'
const LINE_COLOR = '#24292f'
const focusDistLimit = 20

const skeletonCanvas = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D
let canvasWidth = 0
let canvasHeight = 0

const props = defineProps<{
  sprite: Sprite
}>()

const currentPosition = ref({ x: 0, y: 0 })
const draggingJoint = ref<number | null>(null)
const hoverJoint = ref<number | null>(null)
const dragActive = ref(false)

const joints = ref(props.sprite.skeletonAnimation?.joints)
const scale = 40

const idleAnim = useAsyncComputed(() => {
  const clip = props.sprite.skeletonAnimation?.clips.find((clip) => clip.name === 'idle')
  if (clip) {
    return clip.loadAnimFrameData()
  }
  return new Promise<undefined>((resolve) => resolve(undefined))
})

const skeletonTextures = computed(() => {
  if (!props.sprite.skeletonAnimation) return null
  const [url, loading] = useFileUrl(() => props.sprite.skeletonAnimation?.avatar)
  return {
    url,
    loading
  }
})

const initCanvas = () => {
  const canvas = skeletonCanvas.value!
  const { clientWidth, clientHeight } = canvas.parentElement!
  canvasWidth = clientWidth
  canvasHeight = clientHeight
  canvas.width = clientWidth
  canvas.height = clientHeight
  ctx = canvas.getContext('2d')!
  render()
}

const render = () => {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight)
  renderJoints(ctx, joints.value)
}

onMounted(async () => {
  window.addEventListener('resize', initCanvas)
  initCanvas()
})

onUnmounted(() => {
  window.removeEventListener('resize', initCanvas)
})

const renderJoints = (ctx: CanvasRenderingContext2D, joints?: SkeletonAnimation['joints']) => {
  if (!joints) return
  joints.forEach((joint) => {
    const { pos, parent } = joint
    if (parent === -1) return
    const { x, y } = toCanvasCoord(pos)
    const parentPos = joints[parent].pos
    const { x: parentX, y: parentY } = toCanvasCoord(parentPos)
    drawLine(ctx, x, y, parentX, parentY, LINE_COLOR, 2)
  })
  joints.forEach((joint, i) => {
    const { pos } = joint
    const { x, y } = toCanvasCoord(pos)
    // drawJoint(ctx, x, y, 5, JOINT_COLOR)
    drawJoint(ctx, x, y, 5, hoverJoint.value === i ? JOINT_HOVER_COLOR : JOINT_COLOR)
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

const getCloseJoint = (x: number, y: number) => {
  if (!joints.value) return -1
  return joints.value.findIndex((joint) => {
    const { pos } = joint
    const { x: jointX, y: jointY } = toCanvasCoord(pos)
    const dist = Math.hypot(jointX - x, jointY - y)
    return dist < focusDistLimit
  })
}

const selectJoint = (e: MouseEvent) => {
  const { offsetX, offsetY } = e
  const joint = getCloseJoint(offsetX, offsetY)
  if (joint !== -1) {
    draggingJoint.value = joint
    currentPosition.value = toCanvasCoord(joints.value![joint].pos)
    dragActive.value = true
  }
}

const handleMousemove = (e: MouseEvent) => {
  const { offsetX, offsetY } = e
  const joint = getCloseJoint(offsetX, offsetY)
  const savedHoverJoint = hoverJoint.value
  if (joint !== -1) {
    hoverJoint.value = joint
  } else {
    hoverJoint.value = null
  }
  if (savedHoverJoint !== hoverJoint.value) {
    render()
  }
}

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
  z-index: 0;
}

.texture-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  opacity: 0.5;
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
