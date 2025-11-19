<script setup lang="ts">
import { ref, watch } from 'vue'
import paper from 'paper'

// 接口定义
interface ExtendedItem extends paper.Item {
  isControlPoint?: boolean
  isTemporaryControlPoint?: boolean
  boundSegment?: paper.Segment
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
const mouseDownPath = ref<paper.Path | paper.CompoundPath | null>(null)
const mouseDownPos = ref<paper.Point | null>(null)

//注入父组件接口
import { inject } from 'vue'

const getAllPathsValue = inject<() => paper.Path[]>('getAllPathsValue')!
const setAllPathsValue = inject<(paths: paper.Path[]) => void>('setAllPathsValue')!
const exportSvgAndEmit = inject<() => void>('exportSvgAndEmit')!

// 选中路径（独占选择）
const selectPathExclusive = (path: paper.Path | paper.CompoundPath | null): void => {
  getAllPathsValue().forEach((p: paper.Path) => {
    p.selected = false
  })
  if (path) {
    path.selected = true
  }
}

// 创建控制点
const createControlPoint = (segment: paper.Segment): ExtendedItem => {
  const point = new paper.Path.Circle({
    center: segment.point.clone(),
    radius: 4,
    fillColor: '#ff4444',
    strokeColor: '#cc0000',
    strokeWidth: 1
  }) as ExtendedItem

  point.isControlPoint = true
  point.boundSegment = segment

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

const cleanupControlPoint = (point: ExtendedItem): void => {
  if (!point) return
  if (point.parent) {
    point.remove()
  }
  point.boundSegment = undefined
  point.isControlPoint = false
  point.isTemporaryControlPoint = false
  point.onMouseEnter = null
  point.onMouseLeave = null
}

// 显示路径的控制点
const showControlPoints = (path: paper.Path | paper.CompoundPath): void => {
  hideControlPoints()
  selectPathExclusive(path)

  if (path instanceof paper.Path && path.segments) {
    path.segments.forEach((segment: paper.Segment) => {
      const controlPoint = createControlPoint(segment)
      controlPoints.value.push(controlPoint)
    })
  } else if (path instanceof paper.CompoundPath) {
    path.children.forEach((child: paper.Item) => {
      if (child instanceof paper.Path && child.segments) {
        child.segments.forEach((segment: paper.Segment) => {
          const controlPoint = createControlPoint(segment)
          controlPoints.value.push(controlPoint)
        })
      }
    })
  }
}

// 隐藏控制点
const hideControlPoints = (): void => {
  controlPoints.value.forEach((point: ExtendedItem) => {
    cleanupControlPoint(point)
  })
  controlPoints.value = []
  getAllPathsValue().forEach((p: paper.Path) => {
    p.selected = false
  })
  if (paper.project) {
    paper.project.deselectAll()
  }
  paper.view.update()
}

// 检测点击的路径
const getPathAtPoint = (point: paper.Point): paper.Path | paper.CompoundPath | null => {
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

    const pathInArray = getAllPathsValue().find((path) => path === targetItem || path === hitResult.item)
    if (pathInArray) {
      return pathInArray
    }

    if (hitResult.item instanceof paper.Path || hitResult.item instanceof paper.CompoundPath) {
      return hitResult.item as paper.Path
    }
  }
  return null
}

const CONTROL_POINT_HIT_TOLERANCE = 15
const DISTANCE_EPSILON = 1e-6

// 检测点击的控制点
const getControlPointAtPoint = (point: paper.Point): ExtendedItem | null => {
  let closestPoint: ExtendedItem | null = null
  let minDistance = Infinity

  // 逆序遍历以保证重叠时优先命中视觉上位于最上层的控制点
  for (let i = controlPoints.value.length - 1; i >= 0; i--) {
    const controlPoint = controlPoints.value[i]
    if (!controlPoint?.position) continue

    const distance = controlPoint.position.getDistance(point)
    if (distance <= CONTROL_POINT_HIT_TOLERANCE && distance + DISTANCE_EPSILON < minDistance) {
      minDistance = distance
      closestPoint = controlPoint
    }
  }

  return closestPoint
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
  currentSeg.clearHandles() // 清除旧的控制柄

  if (nextSeg && prevSeg) {
    // 使用连接两个相邻节点的向量获取切线
    // 这个方法与路径的绘制方向无关。
    const tangentVector = nextSeg.point.subtract(prevSeg.point)

    // 根据当前点到相邻节点的距离来计算控制柄的长度。
    const lengthToPrev = currentSeg.point.subtract(prevSeg.point).length
    const lengthToNext = nextSeg.point.subtract(currentSeg.point).length

    // 使用归一化后的切线向量来设置控制柄。
    // 乘以一个负数的长度可以巧妙地将向量翻转，用于设置 handleIn。
    // 系数选择0.3，不要问我为什么这么选。这是handle=Pi±α(Pi+1−Pi−1)中的系数，是一个经验值，通常是采取0.2-0.4之间，所以这里我选了0.3
    currentSeg.handleIn = tangentVector.normalize(-lengthToPrev * 0.3)
    currentSeg.handleOut = tangentVector.normalize(lengthToNext * 0.3)
  } else if (nextSeg) {
    // 端点逻辑 (路径的起点)
    const vector = nextSeg.point.subtract(currentSeg.point)
    currentSeg.handleOut = vector.multiply(0.3)
  } else if (prevSeg) {
    // 端点逻辑 (路径的终点)
    const vector = currentSeg.point.subtract(prevSeg.point)
    // 注意：这里应该是 handleIn
    currentSeg.handleIn = vector.multiply(-0.3) // 乘以负数使其指向路径内部
  }
}

// 在路径上添加新的控制点
const addControlPointOnPath = (path: paper.Path | paper.CompoundPath, clickPoint: paper.Point): ExtendedItem | null => {
  const getLocation = (target: paper.Path | paper.CompoundPath): paper.CurveLocation | null => {
    if (typeof (target as paper.Path).getNearestLocation === 'function') {
      return (target as paper.Path).getNearestLocation(clickPoint)
    }
    return null
  }

  const location = getLocation(path)
  const actualPath = location?.path || (path instanceof paper.Path ? path : null)

  if (!location || !actualPath) {
    return null
  }

  // 在指定位置分割曲线，并自动计算新控制柄以保持形状
  const newSegment = actualPath.divideAt(location)

  if (!newSegment) {
    return null
  }

  // 刷新控制点显示（复用原始选择对象，保证CompoundPath保持高亮）
  showControlPoints(path instanceof paper.CompoundPath ? path : actualPath)

  const createdControlPoint = controlPoints.value.find((p: ExtendedItem) => p.boundSegment === newSegment) || null
  paper.view.update()

  return createdControlPoint
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

    const targetSegment = selectedPoint.value.boundSegment
    const parentPath = targetSegment?.path || null

    if (targetSegment && parentPath) {
      targetSegment.point = point

      const segmentIndex = parentPath.segments.indexOf(targetSegment)
      if (segmentIndex >= 0) {
        smoothLocalSegments(parentPath, segmentIndex)
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
    cleanupControlPoint(prevSelected as ExtendedItem)
    controlPoints.value = controlPoints.value.filter((p: ExtendedItem) => p !== prevSelected)

    const hostPath = prevSelected.boundSegment?.path
    if (hostPath) {
      showControlPoints(hostPath)
    } else if (prevMouseDownPath) {
      showControlPoints(prevMouseDownPath)
    }
    paper.view.update()
  }

  if (wasDragging) {
    const currentPaths = getAllPathsValue()
    setAllPathsValue([...currentPaths]) // 触发数据更新
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
  if (controlPoints.value.length > 0 && controlPoints.value[0].boundSegment?.path) {
    const pathToDelete = controlPoints.value[0].boundSegment.path
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
