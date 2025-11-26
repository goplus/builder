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
  data: paper.Item['data'] & {
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
const selectionItems = ref<(paper.Path | paper.CompoundPath | paper.Shape)[]>([])
const selectionBox = ref<paper.Path.Rectangle | null>(null)
const selectionHandles = ref<paper.Path.Rectangle[]>([])
const selectionOriginalPositions = ref<Map<paper.Item, paper.Point>>(new Map())
const selectionOriginalMatrices = ref<Map<paper.Item, paper.Matrix>>(new Map())
const isScaling = ref<boolean>(false)
const scaleInfo = ref<{ handle: string; pivot: paper.Point; startBounds: paper.Rectangle; startVector: paper.Point } | null>(
  null
)
const isMovingSelection = ref<boolean>(false)

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

const clearSelectionOverlay = (): void => {
  if (selectionBox.value) {
    selectionBox.value.remove()
    selectionBox.value = null
  }
  selectionHandles.value.forEach((h) => h.remove())
  selectionHandles.value = []
}

const clearAllSelections = (): void => {
  getAllPathsValue().forEach((p) => {
    p.selected = false
  })
  selectedPath.value = null
  selectionItems.value = []
  clearSelectionOverlay()
}

const selectPathExclusive = (path: paper.Path | paper.CompoundPath | paper.Shape | null): void => {
  clearAllSelections()

  if (path) path.selected = true

  selectedPath.value = path
  selectionItems.value = path ? [path] : []
  updateSelectionOverlay()
  paper.view.update()
}

// 取消选择
const deselectAll = (): void => {
  clearSelectionRectangle()
  clearAllSelections()
  paper.view.update()
}

// 暂时隐藏选区辅助图形，避免导出/存储时被写入
const hideSelectionHelpers = (): (() => void) => {
  const helpers: paper.Item[] = []
  if (selectionBox.value) helpers.push(selectionBox.value)
  helpers.push(...selectionHandles.value)
  const prevVisible = new Map<paper.Item, boolean>()
  helpers.forEach((item) => {
    prevVisible.set(item, item.visible)
    item.visible = false
  })
  return () => {
    helpers.forEach((item) => {
      const v = prevVisible.get(item)
      if (v !== undefined) item.visible = v
    })
  }
}

const withHelpersHidden = <T,>(fn: () => T): T => {
  const restore = hideSelectionHelpers()
  const result = fn()
  restore()
  return result
}

//防止是辅助图形
const isHelperItem = (item: ExtendedItem): boolean => {
  return item.isControlPoint === true || item.data?.isSelectionHelper === true || item.data?.isBackground === true
}

//防止边界显著过大
const isReasonableBounds = (b: paper.Rectangle): boolean => {
  const view = paper.view
  if (!view) return true
  const viewArea = view.bounds.width * view.bounds.height
  const area = b.width * b.height
  // 排除面积接近或超过视图的异常矩形，防止选区被放大到全屏
  return Number.isFinite(area) && area > 0 && area < viewArea * 0.9
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
    if (isHelperItem(target)) {
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

const refreshSelectionItems = (): (paper.Path | paper.CompoundPath | paper.Shape)[] => {
  const paths = getAllPathsValue()
  const selected: (paper.Path | paper.CompoundPath | paper.Shape)[] = []
  paths.forEach((path) => {
    const item = path as ExtendedItem
    if (path.selected && !isHelperItem(item) && isReasonableBounds(path.bounds)) {
      selected.push(path)
    } else if (path.selected && !isReasonableBounds(path.bounds)) {
      // 防止只显示 Paper 默认选中状态而无自定义选区
      path.selected = false
    }
  })
  selectionItems.value = selected
  return selected
}

const selectPathsInRectangle = (bounds: paper.Rectangle): void => {
  const paths = getAllPathsValue()
  let firstSelected: paper.Path | paper.CompoundPath | paper.Shape | null = null

  paths.forEach((path) => {
    const item = path as ExtendedItem
    const isHelper = isHelperItem(item)
    const shouldSelect = !isHelper && isReasonableBounds(path.bounds) && bounds.intersects(path.bounds)
    path.selected = shouldSelect
    if (shouldSelect && !firstSelected) {
      firstSelected = path
    }
  })

  refreshSelectionItems()
  selectedPath.value = firstSelected
  updateSelectionOverlay()
  paper.view.update()
}

const createSelectionBox = (bounds: paper.Rectangle): void => {
  if (selectionBox.value) selectionBox.value.remove()
  selectionHandles.value.forEach((h) => h.remove())
  selectionHandles.value = []

  const rect = new paper.Path.Rectangle({
    from: bounds.topLeft,
    to: bounds.bottomRight,
    strokeColor: '#4da3ff',
    dashArray: [4, 4],
    strokeWidth: 1.5,
    fillColor: new paper.Color(0, 0.6, 1, 0.06)
  }) as paper.Path.Rectangle & ExtendedItem
  rect.data = { ...(rect.data || {}), isSelectionHelper: true }
  rect.locked = true
  selectionBox.value = rect
  paper.project.activeLayer.addChild(rect)
  rect.bringToFront()

  const handleSize = 8
  const corners: { key: string; point: paper.Point }[] = [
    { key: 'nw', point: bounds.topLeft },
    { key: 'ne', point: bounds.topRight },
    { key: 'sw', point: bounds.bottomLeft },
    { key: 'se', point: bounds.bottomRight }
  ]

  corners.forEach(({ key, point }) => {
    const handle = new paper.Path.Rectangle({
      point: point.subtract(new paper.Point(handleSize / 2, handleSize / 2)),
      size: new paper.Size(handleSize, handleSize),
      fillColor: '#ffffff',
      strokeColor: '#4da3ff',
      strokeWidth: 1
    }) as paper.Path.Rectangle & ExtendedItem
    handle.data = { ...(handle.data || {}), isSelectionHelper: true, handleKey: key }
    handle.locked = true
    paper.project.activeLayer.addChild(handle)
    handle.bringToFront()
    selectionHandles.value.push(handle)
  })
}

const updateSelectionOverlay = (): void => {
  const items = refreshSelectionItems()
  if (!items.length) {
    clearSelectionOverlay()
    return
  }

  let bounds = items[0].bounds.clone()
  for (let i = 1; i < items.length; i++) {
    bounds = bounds.unite(items[i].bounds)
  }
  createSelectionBox(bounds)
  paper.view.update()
}

// 处理鼠标按下
const handleMouseDown = (point: paper.Point): void => {
  if (!props.isActive) return

  // 先检测是否点击了缩放手柄
  const hitHandle = selectionHandles.value.find((handle) => handle.bounds.expand(3).contains(point))
  if (hitHandle && selectionItems.value.length > 0) {
    isScaling.value = true
    const key = (hitHandle.data?.handleKey as string) || 'se'
    const items = selectionItems.value
    let bounds = items[0].bounds.clone()
    for (let i = 1; i < items.length; i++) {
      bounds = bounds.unite(items[i].bounds)
    }
    const pivotMap: Record<string, paper.Point> = {
      nw: bounds.bottomRight,
      ne: bounds.bottomLeft,
      sw: bounds.topRight,
      se: bounds.topLeft
    }
    const handlePointMap: Record<string, paper.Point> = {
      nw: bounds.topLeft,
      ne: bounds.topRight,
      sw: bounds.bottomLeft,
      se: bounds.bottomRight
    }
    const handlePoint = handlePointMap[key] || bounds.bottomRight
    scaleInfo.value = {
      handle: key,
      pivot: pivotMap[key] || bounds.center,
      startBounds: bounds.clone(),
      startVector: handlePoint.subtract(pivotMap[key] || bounds.center)
    }
    selectionOriginalMatrices.value.clear()
    selectionItems.value.forEach((item) => {
      if (item.matrix) {
        selectionOriginalMatrices.value.set(item, item.matrix.clone())
      }
    })
    dragStartPoint.value = point.clone()
    return
  }

  // 检测点击在选择框内部用于整体拖动
  if (selectionBox.value && selectionBox.value.bounds.contains(point) && selectionItems.value.length > 0) {
    isMovingSelection.value = true
    hasMoved.value = false
    dragStartPoint.value = point.clone()
    selectionOriginalPositions.value.clear()
    selectionItems.value.forEach((item) => {
      selectionOriginalPositions.value.set(item, item.position.clone())
    })
    skipNextClick.value = true
    return
  }

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

  if (isScaling.value && scaleInfo.value) {
    const { pivot, startVector } = scaleInfo.value
    const currentVector = point.subtract(pivot)
    const EPS = 1e-3
    const MIN = 0.1
    const MAX = 8
    const DAMPING = 0.25 // 缩放灵敏度：越小越平缓

    const baseLen = startVector.length
    const dir = baseLen < EPS ? new paper.Point(1, 1).normalize() : startVector.normalize()
    const projLen = currentVector.dot(dir)
    const rawScale = baseLen < EPS ? 1 : projLen / baseLen

    const clampScale = (value: number): number => {
      if (value > 0 && value < MIN) return MIN
      if (value < 0 && value > -MIN) return -MIN
      return Math.max(-MAX, Math.min(MAX, value))
    }

    const damped = 1 + (rawScale - 1) * DAMPING
    const uniformScale = clampScale(damped)
    const scaleX = uniformScale
    const scaleY = uniformScale

    selectionItems.value.forEach((item) => {
      const orig = selectionOriginalMatrices.value.get(item)
      if (orig) {
        item.matrix = orig.clone()
        item.scale(scaleX, scaleY, pivot)
      }
    })

    hasMoved.value = true
    updateSelectionOverlay()
    paper.view.update()
    return
  }

  if (isMovingSelection.value && dragStartPoint.value) {
    const delta = point.subtract(dragStartPoint.value)
    selectionItems.value.forEach((item) => {
      const origPos = selectionOriginalPositions.value.get(item)
      if (origPos) {
        item.position = origPos.add(delta)
      }
    })
    hasMoved.value = true
    updateSelectionOverlay()
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

  // 点击选区内部空白，若未移动则取消选中
  if (isMovingSelection.value && !hasMoved.value && point && selectionBox.value?.contains(point)) {
    const hitPath = getPathAtPoint(point)
    if (!hitPath) {
      deselectAll()
      isMovingSelection.value = false
      hasMoved.value = false
      dragStartPoint.value = null
      pathOriginalPosition.value = null
      skipNextClick.value = true
      return
    }
  }

  if ((isMovingSelection.value || isScaling.value) && hasMoved.value) {
    const currentPaths = getAllPathsValue()
    withHelpersHidden(() => setAllPathsValue([...currentPaths] as paper.Path[])) // 触发数据更新
    const restore = hideSelectionHelpers()
    exportSvgAndEmit()
    restore()
  }

  isScaling.value = false
  isMovingSelection.value = false
  scaleInfo.value = null
  selectionOriginalMatrices.value.clear()
  selectionOriginalPositions.value.clear()

  // 只有在真正移动路径的情况下才更新数据和导出
  if (isDragging.value && selectedPath.value && hasMoved.value) {
    // 拖动完成,更新路径数组并导出
    const currentPaths = getAllPathsValue()
    withHelpersHidden(() => setAllPathsValue([...currentPaths] as paper.Path[])) // 触发数据更新
    const restore = hideSelectionHelpers()
    exportSvgAndEmit()
    restore()
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
  if (isDragging.value || isMovingSelection.value || isScaling.value) return

  const clickedPath = getPathAtPoint(point)
  if (clickedPath) {
    selectPathExclusive(clickedPath)
  } else {
    deselectAll()
  }
}

// 删除选中的路径
const deleteSelectedPath = (): boolean => {
  const pathsToDelete = getAllPathsValue().filter((path) => path.selected)
  if (pathsToDelete.length === 0 && !selectedPath.value) return false

  const targets = pathsToDelete.length > 0 ? pathsToDelete : selectedPath.value ? [selectedPath.value] : []
  targets.forEach((item) => item.remove())

  // 更新路径数组
  const updatedPaths = getAllPathsValue().filter((path) => !targets.includes(path))
  withHelpersHidden(() => setAllPathsValue(updatedPaths as paper.Path[]))

  selectedPath.value = null
  selectionItems.value = []
  clearSelectionOverlay()
  paper.view.update()

  // 导出更新
  const restore = hideSelectionHelpers()
  exportSvgAndEmit()
  restore()
  return true
}

const hasSelection = (): boolean => selectionItems.value.length > 0
const getSelectedItems = (): (paper.Path | paper.CompoundPath | paper.Shape)[] => [...selectionItems.value]

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
      clearSelectionOverlay()
      isScaling.value = false
      isMovingSelection.value = false
      scaleInfo.value = null
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
  deselectAll,
  deleteSelectedPath,
  hasSelection,
  getSelectedItems
})
</script>

<style scoped>
/* 无样式 */
</style>
