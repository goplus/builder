<template>
  <!-- 临时直线预览 -->
  <svg v-if="isDrawing && startPoint" class="preview-layer" :width="canvasWidth" :height="canvasHeight">
    <line
      :x1="startPointView.x"
      :y1="startPointView.y"
      :x2="previewPointView.x"
      :y2="previewPointView.y"
      :stroke="canvasColor"
      stroke-width="3"
      stroke-dasharray="5,5"
    />
  </svg>
</template>

<script setup lang="ts">
import { type Ref, ref, watch, computed } from 'vue'
import paper from 'paper'
import { projectToView } from '../utils/coordinate-transform'

// Props
interface Props {
  canvasWidth: number
  canvasHeight: number
  isActive: boolean
}

const props = defineProps<Props>()

// // Emits
// interface Emits {
//   (e: 'line-created', line: string): void
// }

// const emit = defineEmits<Emits>()

// 接口定义
interface Point {
  x: number
  y: number
}

// 响应式变量
const isDrawing = ref<boolean>(false)
const startPoint = ref<Point | null>(null)
const previewPoint = ref<Point>({ x: 0, y: 0 })
const canvasColor = inject<Ref<string>>('canvasColor', ref('#000'))

//注入父组件接口
import { inject } from 'vue'

const getAllPathsValue = inject<() => paper.Path[]>('getAllPathsValue')!
const setAllPathsValue = inject<(paths: paper.Path[]) => void>('setAllPathsValue')!
const exportSvgAndEmit = inject<() => void>('exportSvgAndEmit')!

// 将项目坐标转换为视图坐标（用于 SVG 预览）
const startPointView = computed(() => {
  if (!startPoint.value) return { x: 0, y: 0 }
  return projectToView(startPoint.value)
})

const previewPointView = computed(() => {
  return projectToView(previewPoint.value)
})

// 创建直线路径
const createLine = (start: Point, end: Point): paper.Path => {
  const line = new paper.Path()
  line.add(new paper.Point(start.x, start.y))
  line.add(new paper.Point(end.x, end.y))
  line.strokeColor = new paper.Color(canvasColor.value)
  line.strokeWidth = 3

  // 设置线段连接方式为圆滑
  line.strokeCap = 'round'
  line.strokeJoin = 'round'

  return line
}

// 处理画布点击
const handleCanvasClick = (point: Point): void => {
  if (!props.isActive) return

  if (!isDrawing.value) {
    // 开始画线
    isDrawing.value = true
    startPoint.value = { x: point.x, y: point.y }
    previewPoint.value = { x: point.x, y: point.y }
  } else {
    // 完成画线
    const line = createLine(startPoint.value!, point)
    const currentPaths = getAllPathsValue()
    currentPaths.push(line)
    setAllPathsValue(currentPaths)
    exportSvgAndEmit()
    // 重置状态
    resetDrawing()
  }
}

// 处理鼠标移动（更新预览）
const handleMouseMove = (point: Point): void => {
  if (!props.isActive || !isDrawing.value || !startPoint.value) return

  previewPoint.value = { x: point.x, y: point.y }
}

// 重置绘制状态
const resetDrawing = (): void => {
  isDrawing.value = false
  startPoint.value = null
  previewPoint.value = { x: 0, y: 0 }
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

// 暴露方法给父组件
defineExpose({
  handleCanvasClick,
  handleMouseMove,
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
