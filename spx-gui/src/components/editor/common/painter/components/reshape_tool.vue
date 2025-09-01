<script setup lang="ts">
import { ref, watch } from 'vue'
import paper from 'paper'

// 接口定义
interface ExtendedItem extends paper.Item {
  isControlPoint?: boolean
  isTemporaryControlPoint?: boolean
  segmentIndex?: number
  parentPath?: paper.Path
}

// Props定义
const props = defineProps<{
  isActive: boolean
  allPaths: paper.Path[]
}>()

// 状态管理
const isDragging = ref<boolean>(false)
const selectedPoint = ref<ExtendedItem | null>(null)
const controlPoints = ref<ExtendedItem[]>([])
const mouseDownPath = ref<paper.Path | null>(null)
const mouseDownPos = ref<paper.Point | null>(null)

//注入父组件接口
import { inject } from 'vue'

const getAllPathsValue = inject<() => paper.Path[]>('getAllPathsValue')!
const setAllPathsValue = inject<(paths: paper.Path[]) => void>('setAllPathsValue')!
const exportSvgAndEmit = inject<() => void>('exportSvgAndEmit')!

// 选中路径（独占选择）
const selectPathExclusive = (path: paper.Path | null): void => {
  props.allPaths.forEach((p: paper.Path) => {
    p.selected = false
  })
  if (path) {
    path.selected = true
  }
}

// 创建控制点
const createControlPoint = (position: paper.Point): ExtendedItem => {
  const point = new paper.Path.Circle({
    center: position,
    radius: 8,
    fillColor: '#ff4444',
    strokeColor: '#cc0000',
    strokeWidth: 2
  }) as ExtendedItem

  point.isControlPoint = true

  // 添加悬停效果
  point.onMouseEnter = () => {
    point.fillColor = new paper.Color('#ff6666')
    point.scale(1.25)
    paper.view.update()
  }

  point.onMouseLeave = () => {
    point.fillColor = new paper.Color('#ff4444')
    point.scale(0.8)
    paper.view.update()
  }

  return point
}

// 显示路径的控制点
const showControlPoints = (path: paper.Path): void => {
  hideControlPoints()
  selectPathExclusive(path)

  if (path && path.segments) {
    path.segments.forEach((segment: paper.Segment, index: number) => {
      const controlPoint = createControlPoint(segment.point)
      controlPoint.segmentIndex = index
      controlPoint.parentPath = path
      controlPoints.value.push(controlPoint)
    })
  } else if (path instanceof paper.CompoundPath) {
    path.children.forEach((child: paper.Item) => {
      if (child instanceof paper.Path && child.segments) {
        child.segments.forEach((segment: paper.Segment, segIndex: number) => {
          const controlPoint = createControlPoint(segment.point)
          controlPoint.segmentIndex = segIndex
          controlPoint.parentPath = child as paper.Path
          controlPoints.value.push(controlPoint)
        })
      }
    })
  }
}

// 隐藏控制点
const hideControlPoints = (): void => {
  controlPoints.value.forEach((point: ExtendedItem) => {
    if (point && point.parent) {
      point.remove()
    }
  })
  controlPoints.value = []
  props.allPaths.forEach((p: paper.Path) => {
    p.selected = false
  })
  if (paper.project) {
    paper.project.deselectAll()
  }
  paper.view.update()
}

// 检测点击的路径
const getPathAtPoint = (point: paper.Point): paper.Path | null => {
  const hitResult = paper.project.hitTest(point, {
    segments: false,
    stroke: true,
    fill: true,
    tolerance: 15
  })

  if (hitResult && hitResult.item && !(hitResult.item as ExtendedItem).isControlPoint) {
    let targetItem = hitResult.item

    while (targetItem.parent && targetItem.parent !== paper.project.activeLayer) {
      targetItem = targetItem.parent
    }

    const pathInArray = props.allPaths.find((path) => path === targetItem || path === hitResult.item)
    if (pathInArray) {
      return pathInArray
    }

    if (hitResult.item instanceof paper.Path || hitResult.item instanceof paper.CompoundPath) {
      return hitResult.item as paper.Path
    }
  }
  return null
}

// 检测点击的控制点
const getControlPointAtPoint = (point: paper.Point): ExtendedItem | null => {
  const hitResult = paper.project.hitTest(point, {
    segments: false,
    stroke: false,
    fill: true,
    tolerance: 15
  })

  if (hitResult && hitResult.item && (hitResult.item as ExtendedItem).isControlPoint) {
    return hitResult.item as ExtendedItem
  }
  return null
}

// 局部平滑函数
const smoothLocalSegments = (path: paper.Path, segmentIndex: number): void => {
  const segments = path.segments
  const currentSegment = segments[segmentIndex]

  if (!currentSegment) return

  const prevIndex = Math.max(0, segmentIndex - 1)
  const nextIndex = Math.min(segments.length - 1, segmentIndex + 1)

  if (segmentIndex === 0 || segmentIndex === segments.length - 1) {
    if (segmentIndex === 0 && segments.length > 1) {
      const nextSeg = segments[1]
      calculateLocalHandles(currentSegment, nextSeg, null)
    } else if (segmentIndex === segments.length - 1 && segments.length > 1) {
      const prevSeg = segments[segments.length - 2]
      calculateLocalHandles(currentSegment, null, prevSeg)
    }
  } else {
    const prevSeg = segments[prevIndex]
    const nextSeg = segments[nextIndex]
    calculateLocalHandles(currentSegment, nextSeg, prevSeg)
  }
}

// 计算局部贝塞尔曲线控制点
const calculateLocalHandles = (
  currentSeg: paper.Segment,
  nextSeg: paper.Segment | null,
  prevSeg: paper.Segment | null
): void => {
  currentSeg.clearHandles()

  if (nextSeg && prevSeg) {
    const vector1 = currentSeg.point.subtract(prevSeg.point)
    const vector2 = nextSeg.point.subtract(currentSeg.point)

    const angle1 = vector1.angle
    const angle2 = vector2.angle
    const avgAngle = (angle1 + angle2) / 2

    const length1 = vector1.length * 0.3
    const length2 = vector2.length * 0.3

    currentSeg.handleIn = new paper.Point({
      angle: avgAngle + 180,
      length: length1
    })
    currentSeg.handleOut = new paper.Point({
      angle: avgAngle,
      length: length2
    })
  } else if (nextSeg) {
    const vector = nextSeg.point.subtract(currentSeg.point)
    currentSeg.handleOut = vector.multiply(0.3)
  } else if (prevSeg) {
    const vector = currentSeg.point.subtract(prevSeg.point)
    currentSeg.handleIn = vector.multiply(0.3)
  }
}

// 在路径上添加新的控制点
const addControlPointOnPath = (path: paper.Path, clickPoint: paper.Point): ExtendedItem | null => {
  const location = path.getNearestLocation(clickPoint)
  if (location) {
    const insertIndex = location.index + 1
    path.insert(insertIndex, location.point)

    smoothLocalSegments(path, insertIndex)

    showControlPoints(path)

    const created =
      controlPoints.value.find((p: ExtendedItem) => p.parentPath === path && p.segmentIndex === insertIndex) || null
    paper.view.update()
    return created
  }
  return null
}

// 处理鼠标按下
const handleMouseDown = (point: paper.Point): void => {
  if (!props.isActive) return

  const controlPoint = getControlPointAtPoint(point)
  if (controlPoint) {
    isDragging.value = true
    selectedPoint.value = controlPoint
    return
  }

  const clickedPath = getPathAtPoint(point)
  if (clickedPath) {
    mouseDownPath.value = clickedPath
    mouseDownPos.value = point
  } else {
    mouseDownPath.value = null
    mouseDownPos.value = null
  }
}

// 处理鼠标移动
const handleMouseMove = (point: paper.Point): void => {
  if (!props.isActive) return

  if (!isDragging.value && mouseDownPath.value && mouseDownPos.value) {
    const dx = point.x - mouseDownPos.value.x
    const dy = point.y - mouseDownPos.value.y
    const dist2 = dx * dx + dy * dy
    const threshold2 = 3 * 3
    if (dist2 >= threshold2) {
      const tempPoint = addControlPointOnPath(mouseDownPath.value, mouseDownPos.value)
      if (tempPoint) {
        tempPoint.isTemporaryControlPoint = true
        isDragging.value = true
        selectedPoint.value = tempPoint
      }
    }
  }

  if (isDragging.value && selectedPoint.value) {
    selectedPoint.value.position = point

    if (selectedPoint.value.parentPath && selectedPoint.value.segmentIndex !== undefined) {
      const segment = selectedPoint.value.parentPath.segments[selectedPoint.value.segmentIndex]
      if (segment) {
        segment.point = point
        smoothLocalSegments(selectedPoint.value.parentPath, selectedPoint.value.segmentIndex)
      }
    }

    paper.view.update()
  }
}

// 处理鼠标释放
const handleMouseUp = (): void => {
  if (!props.isActive) return

  const prevSelected = selectedPoint.value
  const wasDragging = isDragging.value

  if (isDragging.value) {
    isDragging.value = false
    selectedPoint.value = null
  }

  const prevMouseDownPath = mouseDownPath.value
  mouseDownPath.value = null
  mouseDownPos.value = null

  if (prevSelected && (prevSelected as ExtendedItem).isTemporaryControlPoint) {
    if (prevSelected.parent) {
      prevSelected.remove()
    }
    controlPoints.value = controlPoints.value.filter((p: ExtendedItem) => p !== prevSelected)

    if (prevSelected.parentPath) {
      showControlPoints(prevSelected.parentPath)
    } else if (prevMouseDownPath) {
      showControlPoints(prevMouseDownPath)
    }
    paper.view.update()
  }

  if (wasDragging) {
    // 使用注入的接口而不是事件上报
    exportSvgAndEmit()
  }
}

// 处理点击
const handleClick = (point: paper.Point): void => {
  if (!props.isActive) return

  const controlPoint = getControlPointAtPoint(point)
  if (controlPoint) {
    return
  }

  const clickedPath = getPathAtPoint(point)
  if (clickedPath) {
    showControlPoints(clickedPath)
    paper.view.update()
    return
  }

  hideControlPoints()
  paper.view.update()
}

// 删除选中的路径
const deleteSelectedPath = (): void => {
  if (controlPoints.value.length > 0 && controlPoints.value[0].parentPath) {
    const pathToDelete = controlPoints.value[0].parentPath
    pathToDelete.remove()

    // 使用注入的接口更新路径数组
    const updatedPaths = getAllPathsValue().filter((path: paper.Path) => path !== pathToDelete)
    setAllPathsValue(updatedPaths)

    hideControlPoints()
    paper.view.update()

    // 使用注入的接口而不是事件上报
    exportSvgAndEmit()
  }
}

// 键盘事件处理
const handleKeyDown = (event: KeyboardEvent): void => {
  if (!props.isActive) return

  if (event.key === 'Escape') {
    hideControlPoints()
    paper.view.update()
  } else if (event.key === 'Delete' || event.key === 'Backspace') {
    deleteSelectedPath()
  }
}

// 监听工具激活状态
watch(
  () => props.isActive,
  (isActive) => {
    if (!isActive) {
      hideControlPoints()
    }
  }
)

// 暴露方法给父组件
defineExpose({
  hideControlPoints,
  showControlPoints,
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
  handleClick,
  handleKeyDown
})
</script>

<template>
  <div style="display: none">
    <!-- 这个组件不渲染任何视觉内容，只提供逻辑 -->
  </div>
</template>
