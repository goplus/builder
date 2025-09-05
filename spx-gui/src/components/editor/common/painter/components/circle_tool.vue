<template>
  <!-- 临时圆形预览 -->
  <svg v-if="isDrawing && startPoint" class="preview-layer" :width="canvasWidth" :height="canvasHeight">
    <ellipse
      :cx="centerPoint.x"
      :cy="centerPoint.y"
      :rx="Math.abs(radiusX)"
      :ry="Math.abs(radiusY)"
      fill="none"
      :stroke="canvasColor"
      stroke-width="3"
      stroke-dasharray="5,5"
    />
  </svg>
</template>

<script setup lang="ts">
import { ref, watch, computed, type Ref } from 'vue'
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
const canvasColor = inject<Ref<string>>('canvasColor', ref('#000'))

// 注入父组件接口
import { inject } from 'vue'

const getAllPathsValue = inject<() => paper.Path[]>('getAllPathsValue')!
const setAllPathsValue = inject<(paths: paper.Path[]) => void>('setAllPathsValue')!
const exportSvgAndEmit = inject<() => void>('exportSvgAndEmit')!

// 计算圆心和半径
const centerPoint = computed(() => {
  if (!startPoint.value || !currentPoint.value) return { x: 0, y: 0 }
  return {
    x: (startPoint.value.x + currentPoint.value.x) / 2,
    y: (startPoint.value.y + currentPoint.value.y) / 2
  }
})

const radiusX = computed(() => {
  if (!startPoint.value || !currentPoint.value) return 0
  return Math.abs(currentPoint.value.x - startPoint.value.x) / 2
})

const radiusY = computed(() => {
  if (!startPoint.value || !currentPoint.value) return 0
  return Math.abs(currentPoint.value.y - startPoint.value.y) / 2
})

// 创建圆形/椭圆路径
const createCircle = (center: Point, rx: number, ry: number): paper.Path => {
  let shape: paper.Path

  if (Math.abs(rx - ry) < 5) {
    // 如果 rx 和 ry 相近，创建圆形
    const radius = (rx + ry) / 2
    shape = new paper.Path.Circle({
      center: new paper.Point(center.x, center.y),
      radius: radius
    })
  } else {
    // 否则创建椭圆
    shape = new paper.Path.Ellipse({
      center: new paper.Point(center.x, center.y),
      size: new paper.Size(rx * 2, ry * 2)
    })
  }

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

  // 开始画圆
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

  // 更新最终位置
  currentPoint.value = { x: point.x, y: point.y }

  // 检查是否有足够的尺寸来创建圆形
  const minSize = 10
  if (radiusX.value < minSize && radiusY.value < minSize) {
    resetDrawing()
    return
  }

  // 完成绘制
  const circle = createCircle(centerPoint.value, radiusX.value, radiusY.value)

  const currentPaths = getAllPathsValue()
  currentPaths.push(circle)
  setAllPathsValue(currentPaths)
  exportSvgAndEmit()

  // 重置状态
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
