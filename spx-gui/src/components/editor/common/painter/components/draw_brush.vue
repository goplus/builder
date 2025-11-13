<template>
  <div></div>
</template>

<script setup lang="ts">
import { type Ref, ref, watch } from 'vue'
import paper from 'paper'
import { createStrokeRegionController } from '../utils/strokeRegionController'

// Props
interface Props {
  canvasWidth: number
  canvasHeight: number
  isActive: boolean
  brushThickness: number
}

const props = defineProps<Props>()

// 接口定义
interface Point {
  x: number
  y: number
}

// 响应式变量
const isDrawing = ref<boolean>(false)
const drawingMode = ref<'stroke' | 'region' | null>(null)
const currentPath = ref<paper.Path | null>(null)
const canvasColor = inject<Ref<string>>('canvasColor', ref('#000'))
const strokeRegionController = createStrokeRegionController({
  minDistance: 2,
  simplifyTolerance: 2,
  strokeStyle: {
    strokeCap: 'round',
    strokeJoin: 'round'
  }
})

//注入父组件接口
import { inject } from 'vue'

/*

路径简化公差；数值越大保留的点越少，越小越贴合原始轨迹

paperjs的简化公式采用的是Ramer-Douglas-Peucker算法（RDP）
这里的参数是RDP算法中的tolerance值，单位是像素
当dmax <= tolerance时，表示路径的最大偏差小于等于公差，可以简化路径
当dmax > tolerance时，表示路径的最大偏差大于公差，不能简化路径
在这里我们可以了理解为：
  以PATH_SIMPLIFY_TOLERANCE = 5 为例子，
  当一段曲线的最大偏移距离不超过5像素时，可以用直线替代这条曲线

注：path.simplify() 的默认参数为2.5

*/

const PATH_SIMPLIFY_TOLERANCE = 5

const getAllPathsValue = inject<() => paper.Path[]>('getAllPathsValue')!
const setAllPathsValue = inject<(paths: paper.Path[]) => void>('setAllPathsValue')!
const exportSvgAndEmit = inject<() => void>('exportSvgAndEmit')!

// 创建新路径
const createNewPath = (startPoint: Point): paper.Path => {
  const path = new paper.Path()
  path.strokeColor = new paper.Color(canvasColor.value)
  path.strokeWidth = props.brushThickness ?? 1
  path.strokeCap = 'round'
  path.strokeJoin = 'round'

  path.add(new paper.Point(startPoint.x, startPoint.y))

  return path
}

const isRegionMode = (): boolean => {
  return (props.brushThickness ?? 1) > 1
}

const resolveRegionStrokeWidth = (): number => {
  const raw = props.brushThickness ?? 1
  if (raw <= 1) return 1
  const clamped = Math.min(Math.max(raw, 2), 10)
  const minWidth = 12
  const maxWidth = 60
  const ratio = (clamped - 2) / 8
  return Math.round(minWidth + ratio * (maxWidth - minWidth))
}

const toPaperPoint = (point: Point): paper.Point => new paper.Point(point.x, point.y)

const startRegionStroke = (point: Point): void => {
  strokeRegionController.startStroke({
    point: toPaperPoint(point),
    strokeWidth: resolveRegionStrokeWidth(),
    strokeColor: new paper.Color(canvasColor.value),
    strokeCap: 'round',
    strokeJoin: 'round'
  })
}

const finalizeRegionStroke = (): void => {
  const { region, strokePath } = strokeRegionController.finalizeRegion()

  if (strokePath) {
    strokePath.remove()
  }

  if (region) {
    region.fillColor = new paper.Color(canvasColor.value)
    region.strokeColor = null
    region.strokeWidth = 0

    const updatedPaths = getAllPathsValue()
    setAllPathsValue(updatedPaths)
    exportSvgAndEmit()
  } else {
    strokeRegionController.reset(true)
  }
}

// 处理鼠标按下
const handleMouseDown = (point: Point): void => {
  if (!props.isActive) return

  isDrawing.value = true
  drawingMode.value = isRegionMode() ? 'region' : 'stroke'

  if (drawingMode.value === 'region') {
    startRegionStroke(point)
    return
  }

  currentPath.value = createNewPath(point)
}

// 处理鼠标拖拽
const handleMouseDrag = (point: Point): void => {
  if (!props.isActive || !isDrawing.value) return

  if (drawingMode.value === 'region') {
    strokeRegionController.extendStroke(toPaperPoint(point))
    paper.view.update()
    return
  }

  if (!currentPath.value) return

  currentPath.value.add(new paper.Point(point.x, point.y))
  paper.view.update()
}

// 处理鼠标释放
const handleMouseUp = (): void => {
  if (!props.isActive || !isDrawing.value) return

  if (drawingMode.value === 'region') {
    finalizeRegionStroke()
  } else if (currentPath.value) {
    // 简化锚点，避免生成过多控制点
    if (currentPath.value.segments.length > 2) {
      currentPath.value.simplify(PATH_SIMPLIFY_TOLERANCE)
    }
    const currentPaths = getAllPathsValue()
    currentPaths.push(currentPath.value)
    setAllPathsValue(currentPaths)
    exportSvgAndEmit()
  }

  resetDrawing()
  paper.view.update()
}

// 重置绘制状态
const resetDrawing = (): void => {
  isDrawing.value = false
  currentPath.value = null
  drawingMode.value = null

  if (strokeRegionController.getPath()) {
    strokeRegionController.reset(true)
  }
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

// 监听粗细变化，若当前在绘制则同步路径线宽
watch(
  () => props.brushThickness,
  (newValue) => {
    if (drawingMode.value !== 'stroke') return
    if (currentPath.value) {
      currentPath.value.strokeWidth = newValue
      paper.view.update()
    }
  }
)

// 暴露方法给父组件
defineExpose({
  handleMouseDown,
  handleMouseDrag,
  handleMouseUp,
  resetDrawing,
  isDrawing: isDrawing.value
})
</script>

<style scoped>
/* 笔刷组件不需要额外样式 */
</style>
