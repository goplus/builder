<template>
  <div style="display: none">
    <!-- 这个组件不渲染任何视觉内容,只提供逻辑 -->
  </div>
</template>

<script setup lang="ts">
import { ref, watch, inject } from 'vue'
import paper from 'paper'
import { projectPaperPointToView } from '../utils/coordinate-transform'

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
const isUpdateScheduled = ref<boolean>(false) // 用于节流画布更新

// 画布拖拽相关
const isPanningCanvas = ref<boolean>(false)
const panStartCenter = ref<paper.Point | null>(null)
const dragStartScreenPoint = ref<paper.Point | null>(null) // 保存屏幕坐标

// 注入父组件
const getAllPathsValue = inject<() => (paper.Path | paper.CompoundPath | paper.Shape)[]>('getAllPathsValue')!
const setAllPathsValue = inject<(paths: paper.Path[]) => void>('setAllPathsValue')!
const exportSvgAndEmit = inject<() => void>('exportSvgAndEmit')!
const isViewBoundsWithinBoundary = inject<(center: paper.Point, zoom: number) => boolean>('isViewBoundsWithinBoundary')!

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
    // 准备拖动路径
    isDragging.value = true
    hasMoved.value = false // 重置移动标志
    dragStartPoint.value = point.clone()
    pathOriginalPosition.value = clickedPath.position.clone()
    isPanningCanvas.value = false
  } else {
    // 点击空白处，准备拖动画布
    deselectAll()
    isPanningCanvas.value = true
    dragStartPoint.value = point.clone()
    if (paper.view) {
      panStartCenter.value = paper.view.center.clone()
      // 保存起始点的屏幕坐标，避免拖动时坐标系变化导致抖动
      const viewPoint = projectPaperPointToView(point)
      dragStartScreenPoint.value = new paper.Point(viewPoint.x, viewPoint.y)
    }
    hasMoved.value = false
  }
}

// 处理鼠标移动(拖动)
const handleMouseMove = (point: paper.Point): void => {
  if (!props.isActive || !dragStartPoint.value) return

  // 处理画布拖拽
  if (isPanningCanvas.value && panStartCenter.value && dragStartScreenPoint.value && paper.view) {
    // 将当前鼠标的项目坐标转换为屏幕坐标
    const viewPoint = projectPaperPointToView(point)
    const currentScreenPoint = new paper.Point(viewPoint.x, viewPoint.y)

    // 在屏幕坐标系中计算差值（避免因 view.center 变化导致坐标系抖动）
    const screenDelta = currentScreenPoint.subtract(dragStartScreenPoint.value)

    // 只有移动距离超过阈值才认为是真正的拖动
    if (screenDelta.length > 1) {
      hasMoved.value = true
    }

    // 将屏幕坐标差值转换为项目坐标差值（除以缩放比例）
    const projectDelta = screenDelta.divide(paper.view.zoom)

    // 计算新的画布中心
    const newCenter = panStartCenter.value.subtract(projectDelta)

    // 检查新的 center 是否会导致超出边界
    if (!isViewBoundsWithinBoundary(newCenter, paper.view.zoom)) {
      // 拒绝移动，保持当前状态
      return
    }

    // 反向移动画布中心（因为拖动画布是让画布跟随鼠标）
    paper.view.center = newCenter

    // 使用 requestAnimationFrame 节流重绘
    if (!isUpdateScheduled.value) {
      isUpdateScheduled.value = true
      requestAnimationFrame(() => {
        paper.view.update()
        isUpdateScheduled.value = false
      })
    }
    return
  }

  // 处理路径拖拽
  if (!isDragging.value || !selectedPath.value) return

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

  // 使用 requestAnimationFrame 节流重绘
  if (!isUpdateScheduled.value) {
    isUpdateScheduled.value = true
    requestAnimationFrame(() => {
      paper.view.update()
      isUpdateScheduled.value = false
    })
  }
}

// 处理鼠标释放
const handleMouseUp = (): void => {
  if (!props.isActive) return

  // 只有在真正移动路径的情况下才更新数据和导出
  if (isDragging.value && selectedPath.value && hasMoved.value && !isPanningCanvas.value) {
    // 拖动完成,更新路径数组并导出
    const currentPaths = getAllPathsValue()
    setAllPathsValue([...currentPaths] as paper.Path[]) // 触发数据更新
    exportSvgAndEmit()
  }

  // 重置所有拖动状态
  isDragging.value = false
  isPanningCanvas.value = false
  hasMoved.value = false
  dragStartPoint.value = null
  pathOriginalPosition.value = null
  panStartCenter.value = null
  dragStartScreenPoint.value = null
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
      isPanningCanvas.value = false
      hasMoved.value = false
      dragStartPoint.value = null
      pathOriginalPosition.value = null
      panStartCenter.value = null
      dragStartScreenPoint.value = null
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
