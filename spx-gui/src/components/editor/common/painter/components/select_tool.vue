<template>
  <div style="display: none">
    <!-- 这个组件不渲染任何视觉内容,只提供逻辑 -->
  </div>
</template>

<script setup lang="ts">
import { ref, watch, inject } from 'vue'
import paper from 'paper'

// 接口定义
interface ExtendedItem extends paper.Item {
  isControlPoint?: boolean
  originalPosition?: paper.Point
}

// Props定义
const props = defineProps<{
  isActive: boolean
}>()

// 状态管理
const isDragging = ref<boolean>(false)
const hasMoved = ref<boolean>(false) // 追踪是否真正移动过
const selectedPath = ref<paper.Path | paper.CompoundPath | paper.Shape | null>(null)
const dragStartPoint = ref<paper.Point | null>(null)
const pathOriginalPosition = ref<paper.Point | null>(null)

// 注入父组件接口
const getAllPathsValue = inject<() => (paper.Path | paper.CompoundPath | paper.Shape)[]>('getAllPathsValue')!
const setAllPathsValue = inject<(paths: paper.Path[]) => void>('setAllPathsValue')!
const exportSvgAndEmit = inject<() => void>('exportSvgAndEmit')!

// 选中路径(独占选择)
const selectPathExclusive = (path: paper.Path | paper.CompoundPath | paper.Shape | null): void => {
  // 如果有已选中的路径，并且它不是将要选中的路径，则取消它的选中状态
  if (selectedPath.value && selectedPath.value !== path) {
    selectedPath.value.selected = false
  }

  // 选中指定路径
  if (path) {
    path.selected = true
  }

  selectedPath.value = path
  paper.view.update()
}

// 取消选择
const deselectAll = (): void => {
  selectPathExclusive(null)
}

// 检测点击的路径
const getPathAtPoint = (point: paper.Point): paper.Path | paper.CompoundPath | paper.Shape | null => {
  const hitResult = paper.project.hitTest(point, {
    segments: false,
    stroke: true,
    fill: true,
    tolerance: 15 // Radius of the point which is clicked on
  })

  if (hitResult && hitResult.item && !(hitResult.item as ExtendedItem).isControlPoint) {
    let targetItem = hitResult.item

    // 向上查找直到找到顶层项目
    while (targetItem.parent && targetItem.parent !== paper.project.activeLayer) {
      targetItem = targetItem.parent
    }

    // 在allPaths中查找该路径
    const pathInArray = getAllPathsValue().find((path) => path === targetItem || path === hitResult.item)
    if (pathInArray) {
      return pathInArray
    }

    // 如果是Path、CompoundPath或Shape类型，直接返回
    if (
      hitResult.item instanceof paper.Path ||
      hitResult.item instanceof paper.CompoundPath ||
      hitResult.item instanceof paper.Shape
    ) {
      return hitResult.item
    }
  }
  return null
}

// 处理鼠标按下
const handleMouseDown = (point: paper.Point): void => {
  if (!props.isActive) return

  const clickedPath = getPathAtPoint(point)

  if (clickedPath) {
    // 选中路径
    selectPathExclusive(clickedPath)
    // 准备拖动
    isDragging.value = true
    hasMoved.value = false // 重置移动标志
    dragStartPoint.value = point.clone()
    pathOriginalPosition.value = clickedPath.position.clone()
  } else {
    // 点击空白处,取消选择
    deselectAll()
  }
}

// 处理鼠标移动(拖动)
const handleMouseMove = (point: paper.Point): void => {
  if (!props.isActive || !isDragging.value || !selectedPath.value || !dragStartPoint.value) return

  // 计算偏移量
  const delta = point.subtract(dragStartPoint.value)

  // 只有移动距离超过阈值才认为是真正的拖动
  if (delta.length > 1) {
    hasMoved.value = true
  }

  // 移动路径到新位置
  if (pathOriginalPosition.value) {
    selectedPath.value.position = pathOriginalPosition.value.add(delta)
  }

  paper.view.update()
}

// 处理鼠标释放
const handleMouseUp = (): void => {
  if (!props.isActive) return

  // 只有在真正移动过的情况下才更新数据和导出
  if (isDragging.value && selectedPath.value && hasMoved.value) {
    // 拖动完成,更新路径数组并导出
    const currentPaths = getAllPathsValue()
    setAllPathsValue([...currentPaths] as paper.Path[]) // 触发数据更新
    exportSvgAndEmit()
  }

  // 重置拖动状态
  isDragging.value = false
  hasMoved.value = false
  dragStartPoint.value = null
  pathOriginalPosition.value = null
}

// 处理点击(用于单纯的选择,不拖动的情况)
const handleClick = (point: paper.Point): void => {
  if (!props.isActive) return

  // 如果刚才有拖动,则不处理点击
  if (isDragging.value) return

  const clickedPath = getPathAtPoint(point)
  if (clickedPath) {
    selectPathExclusive(clickedPath)
  } else {
    deselectAll()
  }
}

// 删除选中的路径
const deleteSelectedPath = (): void => {
  if (selectedPath.value) {
    const pathToDelete = selectedPath.value
    pathToDelete.remove()

    // 更新路径数组
    const updatedPaths = getAllPathsValue().filter((path) => path !== pathToDelete)
    setAllPathsValue(updatedPaths as paper.Path[])

    selectedPath.value = null
    paper.view.update()

    // 导出更新
    exportSvgAndEmit()
  }
}

// 键盘事件处理
const handleKeyDown = (event: KeyboardEvent): void => {
  if (!props.isActive) return

  if (event.key === 'Escape') {
    deselectAll()
  } else if (event.key === 'Delete' || event.key === 'Backspace') {
    deleteSelectedPath()
  }
}

// 监听工具激活状态
watch(
  () => props.isActive,
  (isActive) => {
    if (!isActive) {
      deselectAll()
      isDragging.value = false
      hasMoved.value = false
      dragStartPoint.value = null
      pathOriginalPosition.value = null
    }
  }
)

// 暴露方法给父组件和事件委托器
defineExpose({
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
  handleClick,
  handleKeyDown,
  deselectAll
})
</script>

<style scoped>
/* 无样式 */
</style>
