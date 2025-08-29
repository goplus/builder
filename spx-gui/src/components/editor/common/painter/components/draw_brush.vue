<template>
  <div></div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
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
const currentPath = ref<paper.Path | null>(null)

//注入父组件接口
import { inject } from 'vue'  

const getAllPathsValue = inject<() => paper.Path[]>('getAllPathsValue')!
const setAllPathsValue = inject<(paths: paper.Path[]) => void>('setAllPathsValue')!
const exportSvgAndEmit = inject<() => void>('exportSvgAndEmit')!

// 创建新路径
const createNewPath = (startPoint: Point): paper.Path => {
  const path = new paper.Path()
  path.strokeColor = new paper.Color('black')
  path.strokeWidth = 2
  path.strokeCap = 'round'
  path.strokeJoin = 'round'
  
  // 添加起始点
  path.add(new paper.Point(startPoint.x, startPoint.y))
  
  return path
}

// 处理鼠标按下
const handleMouseDown = (point: Point): void => {
  if (!props.isActive) return
  
  isDrawing.value = true
  currentPath.value = createNewPath(point)
}

// 处理鼠标拖拽
const handleMouseDrag = (point: Point): void => {
  if (!props.isActive || !isDrawing.value || !currentPath.value) return
  
  // 向当前路径添加点
  currentPath.value.add(new paper.Point(point.x, point.y))
  paper.view.update()
}

// 处理鼠标释放
const handleMouseUp = (): void => {
  if (!props.isActive || !isDrawing.value) return
  
  // 完成当前路径绘制
  if (currentPath.value) {
    // 使用注入的接口而不是事件上报
    const currentPaths = getAllPathsValue()
    currentPaths.push(currentPath.value)
    setAllPathsValue(currentPaths)
    exportSvgAndEmit()
  }
  
  // 重置状态
  resetDrawing()
  paper.view.update()
}

// 重置绘制状态
const resetDrawing = (): void => {
  isDrawing.value = false
  currentPath.value = null
}

// 监听工具切换，重置状态
watch(() => props.isActive, (newValue) => {
  if (!newValue) {
    resetDrawing()
  }
})

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