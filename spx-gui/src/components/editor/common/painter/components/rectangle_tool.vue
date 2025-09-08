<template>
  <!-- 临时矩形预览 -->
  <svg v-if="isDrawing && startPoint" class="preview-layer" :width="canvasWidth" :height="canvasHeight">
    <rect
      :x="previewRect.x"
      :y="previewRect.y"
      :width="previewRect.width"
      :height="previewRect.height"
      fill="none"
      :stroke="canvasColor"
      stroke-width="3"
      stroke-dasharray="5,5"
    />
  </svg>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted, type Ref } from 'vue'
import paper from 'paper'
// Props
interface Props {
  canvasWidth: number
  canvasHeight: number
  isActive: boolean
}
const props = defineProps<Props>()
// 接口定义
interface Point {
  x: number
  y: number
}
// 响应式变量
const isDrawing = ref<boolean>(false)
const startPoint = ref<Point | null>(null)
const currentPoint = ref<Point>({ x: 0, y: 0 })
const constrainSquare = ref<boolean>(false)
const canvasColor = inject<Ref<string>>('canvasColor', ref('#000'))

// 注入父组件接口
import { inject } from 'vue'
const getAllPathsValue = inject<() => paper.Path[]>('getAllPathsValue')!
const setAllPathsValue = inject<(paths: paper.Path[]) => void>('setAllPathsValue')!
const exportSvgAndEmit = inject<() => void>('exportSvgAndEmit')!
// 计算预览矩形
const previewRect = computed(() => {
  if (!startPoint.value) return { x: 0, y: 0, width: 0, height: 0 }
  const sx = startPoint.value.x
  const sy = startPoint.value.y
  const cx = currentPoint.value.x
  const cy = currentPoint.value.y
  let dx = cx - sx
  let dy = cy - sy
  if (constrainSquare.value) {
    const side = Math.min(Math.abs(dx), Math.abs(dy))
    const signX = dx < 0 ? -1 : 1
    const signY = dy < 0 ? -1 : 1
    const w = side
    const h = side
    const x = signX < 0 ? sx - w : sx
    const y = signY < 0 ? sy - h : sy
    return { x, y, width: w, height: h }
  } else {
    const x = Math.min(sx, cx)
    const y = Math.min(sy, cy)
    const w = Math.abs(dx)
    const h = Math.abs(dy)
    return { x, y, width: w, height: h }
  }
})
// 创建矩形/正方形路径
const createRectangle = (rect: { x: number; y: number; width: number; height: number }): paper.Path => {
  const shape = new paper.Path.Rectangle({
    point: new paper.Point(rect.x, rect.y),
    size: new paper.Size(rect.width, rect.height)
  })
  shape.strokeColor = new paper.Color(canvasColor.value)
  shape.strokeWidth = 3
  shape.fillColor = null
  // 设置线段连接方式为圆滑
  shape.strokeCap = 'round'
  shape.strokeJoin = 'round'
  return shape
}
// 处理鼠标按下
const handleMouseDown = (point: paper.Point): void => {
  if (!props.isActive) return
  isDrawing.value = true
  startPoint.value = { x: point.x, y: point.y }
  currentPoint.value = { x: point.x, y: point.y }
}
// 处理鼠标移动（更新预览）
const handleMouseMove = (point: paper.Point): void => {
  if (!props.isActive || !isDrawing.value || !startPoint.value) return
  currentPoint.value = { x: point.x, y: point.y }
}
// 处理鼠标释放
const handleMouseUp = (point: paper.Point): void => {
  if (!props.isActive || !isDrawing.value || !startPoint.value) return
  currentPoint.value = { x: point.x, y: point.y }
  const rect = previewRect.value
  const minSize = 5
  if (rect.width < minSize && rect.height < minSize) {
    resetDrawing()
    return
  }
  const rectangle = createRectangle(rect)
  const currentPaths = getAllPathsValue()
  currentPaths.push(rectangle)
  setAllPathsValue(currentPaths)
  exportSvgAndEmit()
  resetDrawing()
}
// 重置绘制状态
const resetDrawing = (): void => {
  isDrawing.value = false
  startPoint.value = null
  currentPoint.value = { x: 0, y: 0 }
}
// 监听工具切换，重置状态
watch(
  () => props.isActive,
  (newValue) => {
    if (!newValue) {
      resetDrawing()
    }
  }
)
// 监听 Shift 键控制正方形约束
const handleKeyDown = (e: KeyboardEvent): void => {
  if (e.key === 'Shift') constrainSquare.value = true
}
const handleKeyUp = (e: KeyboardEvent): void => {
  if (e.key === 'Shift') constrainSquare.value = false
}
onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
})
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
})
// 暴露方法给父组件和事件委托器
defineExpose({
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
  resetDrawing,
  isDrawing: isDrawing.value
})
</script>

<style scoped>
.preview-layer {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 2;
  height: 100%;
  width: 100%;
}
</style>
