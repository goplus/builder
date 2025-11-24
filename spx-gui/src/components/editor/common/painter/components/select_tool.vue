<template>
  <div style="display: none">
    <!-- 这个组件不渲染任何视觉内容,只提供逻辑 -->
  </div>
</template>

<script setup lang="ts">
import { ref, watch, inject } from 'vue'
import paper from 'paper'
import { createViewUpdateScheduler } from '../utils/view-update-scheduler'

// 接口定义
interface ExtendedItem extends paper.Item {
  isControlPoint?: boolean
  originalPosition?: paper.Point
  data?: {
    isSelectionHelper?: boolean
    [key: string]: any
  }
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
const scheduleViewUpdate = createViewUpdateScheduler(isUpdateScheduled)
const isSelectingArea = ref<boolean>(false)
const selectionStartPoint = ref<paper.Point | null>(null)
const selectionRectangle = ref<paper.Path.Rectangle | null>(null)
const skipNextClick = ref<boolean>(false)
const selectionStarted = ref<boolean>(false)

// 注入父组件
const getAllPathsValue = inject<() => (paper.Path | paper.CompoundPath | paper.Shape)[]>('getAllPathsValue')!
const setAllPathsValue = inject<(paths: paper.Path[]) => void>('setAllPathsValue')!
const exportSvgAndEmit = inject<() => void>('exportSvgAndEmit')!

// 选中路径(独占选择)
const clearSelectionRectangle = (): void => {
  if (selectionRectangle.value) {
    selectionRectangle.value.remove()
    selectionRectangle.value = null
  }
  selectionStartPoint.value = null
  isSelectingArea.value = false
  selectionStarted.value = false
  paper.view.update()
}

const clearAllSelections = (): void => {
  getAllPathsValue().forEach((p) => {
    p.selected = false
  })
  selectedPath.value = null
}

const selectPathExclusive = (path: paper.Path | paper.CompoundPath | paper.Shape | null): void => {
  clearAllSelections()

  if (path) path.selected = true

  selectedPath.value = path
  paper.view.update()
}

// 取消选择
const deselectAll = (): void => {
  clearSelectionRectangle()
  clearAllSelections()
  paper.view.update()
}

// 检测点击的路径
const getPathAtPoint = (point: paper.Point): paper.Path | paper.CompoundPath | paper.Shape | null => {
  const hitResult = paper.project.hitTest(point, {
    segments: false,
    stroke: true,
    fill: true,
    tolerance: 15 // Radius of the point which is clicked on
  })

  if (hitResult && hitResult.item) {
    const target = hitResult.item as ExtendedItem
    if (target.isControlPoint || target.data?.isSelectionHelper) {
      return null
    }

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

const drawSelectionRectangle = (start: paper.Point, current: paper.Point): void => {
  if (selectionRectangle.value) {
    selectionRectangle.value.remove()
  }

  const rect = new paper.Path.Rectangle({
    from: start,
    to: current,
    strokeColor: '#4da3ff',
    dashArray: [4, 4],
    strokeWidth: 1,
    fillColor: new paper.Color(0, 0.6, 1, 0.08)
  }) as paper.Path.Rectangle & ExtendedItem

  rect.data = { ...(rect.data || {}), isSelectionHelper: true }
  rect.locked = true

  selectionRectangle.value = rect
}

const selectPathsInRectangle = (bounds: paper.Rectangle): void => {
  const paths = getAllPathsValue()
  let firstSelected: paper.Path | paper.CompoundPath | paper.Shape | null = null

  paths.forEach((path) => {
    const item = path as ExtendedItem
    const isHelper = item.isControlPoint || item.data?.isSelectionHelper
    const shouldSelect = !isHelper && bounds.intersects(path.bounds)
    path.selected = shouldSelect
    if (shouldSelect && !firstSelected) {
      firstSelected = path
    }
  })

  selectedPath.value = firstSelected
  paper.view.update()
}

// 处理鼠标按下
const handleMouseDown = (point: paper.Point): void => {
  if (!props.isActive) return

  const clickedPath = getPathAtPoint(point)

  if (clickedPath) {
    clearSelectionRectangle()
    // 选中路径
    selectPathExclusive(clickedPath)
    // 准备拖动路径
    isDragging.value = true
    hasMoved.value = false // 重置移动标志
    dragStartPoint.value = point.clone()
    pathOriginalPosition.value = clickedPath.position.clone()
  } else {
    // 点击空白处开始框选
    deselectAll()
    hasMoved.value = false
    isDragging.value = false
    dragStartPoint.value = null
    pathOriginalPosition.value = null
    isSelectingArea.value = true
    selectionStartPoint.value = point.clone()
    selectionStarted.value = false
  }
}

// 处理鼠标移动(拖动)
const handleMouseMove = (point: paper.Point): void => {
  if (!props.isActive) return

  if (isSelectingArea.value && selectionStartPoint.value) {
    const delta = point.subtract(selectionStartPoint.value)
    if (!selectionStarted.value && delta.length <= 2) {
      return
    }
    selectionStarted.value = true
    drawSelectionRectangle(selectionStartPoint.value, point)
    paper.view.update()
    return
  }

  // 处理路径拖拽
  if (!dragStartPoint.value) return
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

  scheduleViewUpdate()
}

// 处理鼠标释放
const handleMouseUp = (point?: paper.Point): void => {
  if (!props.isActive) return

  if (isSelectingArea.value) {
    if (selectionRectangle.value) {
      const bounds = selectionRectangle.value.bounds.clone()
      clearSelectionRectangle()
      selectPathsInRectangle(bounds)
      skipNextClick.value = true
    } else {
      clearSelectionRectangle()
    }
    isDragging.value = false
    hasMoved.value = false
    dragStartPoint.value = null
    pathOriginalPosition.value = null
    return
  }

  // 只有在真正移动路径的情况下才更新数据和导出
  if (isDragging.value && selectedPath.value && hasMoved.value) {
    // 拖动完成,更新路径数组并导出
    const currentPaths = getAllPathsValue()
    setAllPathsValue([...currentPaths] as paper.Path[]) // 触发数据更新
    exportSvgAndEmit()
  }

  // 重置所有拖动状态
  isDragging.value = false
  hasMoved.value = false
  dragStartPoint.value = null
  pathOriginalPosition.value = null
}

// 处理点击(用于单纯的选择,不拖动的情况)
const handleClick = (point: paper.Point): void => {
  if (!props.isActive) return

  if (skipNextClick.value) {
    skipNextClick.value = false
    return
  }

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
  const pathsToDelete = getAllPathsValue().filter((path) => path.selected)
  if (pathsToDelete.length === 0 && !selectedPath.value) return

  const targets = pathsToDelete.length > 0 ? pathsToDelete : selectedPath.value ? [selectedPath.value] : []
  targets.forEach((item) => item.remove())

  // 更新路径数组
  const updatedPaths = getAllPathsValue().filter((path) => !targets.includes(path))
  setAllPathsValue(updatedPaths as paper.Path[])

  selectedPath.value = null
  paper.view.update()

  // 导出更新
  exportSvgAndEmit()
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
      clearSelectionRectangle()
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
