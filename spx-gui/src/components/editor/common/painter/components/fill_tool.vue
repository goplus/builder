<template>
  <div class="fill-tool">
    <!-- CSS自定义光标 -->
    <div v-if="isActive && showCursor" class="fill-cursor" :style="cursorStyle"></div>
  </div>
</template>

<script setup lang="ts">
import { inject, ref, type Ref, computed, watch, onMounted, onUnmounted } from 'vue'
import paper from 'paper'

// Props
interface Props {
  canvasWidth: number
  canvasHeight: number
  isActive: boolean
}

const props = defineProps<Props>()

// 注入父组件接口
const exportSvgAndEmit = inject<() => void>('exportSvgAndEmit')!
const canvasColor = inject<Ref<string>>('canvasColor', ref('#000'))
const getAllPathsValue = inject<() => paper.Path[]>('getAllPathsValue')!
const setAllPathsValue = inject<(paths: paper.Path[]) => void>('setAllPathsValue')!

// CSS光标相关状态
const showCursor = ref<boolean>(false)
const cursorPosition = ref<{ x: number; y: number }>({ x: 0, y: 0 })
// 画布元素引用
const canvasElement = ref<HTMLElement | null>(null)
// 填充工具光标大小（固定）
const fillCursorSize = 24

// 计算光标样式
const cursorStyle = computed(() => ({
  width: fillCursorSize + 'px',
  height: fillCursorSize + 'px',
  left: cursorPosition.value.x - fillCursorSize / 2 + 'px',
  top: cursorPosition.value.y - fillCursorSize / 2 + 'px'
}))

// 更新CSS光标位置
const updateCursorPosition = (point: paper.Point): void => {
  if (!canvasElement.value) return

  const canvasRect = canvasElement.value.getBoundingClientRect()
  cursorPosition.value = {
    x: point.x + canvasRect.left,
    y: point.y + canvasRect.top
  }
}

// 获取画布元素
const getCanvasElement = (): void => {
  const canvas = paper.view?.element
  if (canvas) {
    canvasElement.value = canvas
  }
}

// 处理鼠标进入画布事件
const handleMouseEnter = (point: paper.Point): void => {
  if (props.isActive) {
    showCursor.value = true
    updateCursorPosition(point)
  }
}

// 处理鼠标移动事件
const handleMouseMove = (point: paper.Point): void => {
  if (!props.isActive) return

  // 更新CSS光标位置
  updateCursorPosition(point)
}

// 处理鼠标离开画布事件
const handleMouseLeave = (): void => {
  showCursor.value = false
}

/**
 * 更新路径并记录历史
 */
const updatePathsWithHistory = (): void => {
  // 获取当前画布上的所有路径 - 确保获取最新状态
  const currentPaths = getAllPathsValue().filter((path): path is paper.Path => path instanceof paper.Path)

  // 使用 setAllPathsValue 来更新路径并记录历史
  setAllPathsValue(currentPaths)

  // 触发导出和更新
  paper.view.update()
  exportSvgAndEmit()
}

/**
 * 优化后的智能填充实现
 * 专门处理重叠图形的填充问题
 * @param {paper.Point} point 用户点击的画布坐标
 */
const smartFill = (point: paper.Point): void => {
  if (!props.isActive) return

  const allPaths = getAllPathsValue().filter(
    (path): path is paper.Path => path instanceof paper.Path && !(path as any).guide && path.visible
  )

  // --- 步骤 1: 智能路径分析和优先级排序 ---
  const pathsWithPriority = allPaths
    .map((path, index) => {
      const hasStroke = !!path.strokeColor
      const hasFill = !!path.fillColor
      const area = path.bounds.width * path.bounds.height
      const isCanvasSize =
        Math.abs(path.bounds.width - props.canvasWidth) < 1 && Math.abs(path.bounds.height - props.canvasHeight) < 1

      // 计算与点击点的距离（用于处理重叠情况）
      const centerDistance = point.getDistance(path.bounds.center)

      return {
        path,
        index,
        hasStroke,
        hasFill,
        area,
        isCanvasSize,
        centerDistance,
        priority: hasStroke ? (hasFill ? 2 : 3) : hasFill ? 1 : 0 // 边框+填充>边框>填充>无
      }
    })
    .sort((a, b) => {
      // 优先级排序：先按优先级，再按面积（小的优先），最后按距离
      if (a.priority !== b.priority) return b.priority - a.priority
      if (Math.abs(a.area - b.area) > 100) return a.area - b.area
      return a.centerDistance - b.centerDistance
    })

  // --- 步骤 2: 优先尝试直接路径填充 ---
  const tempPaths: paper.Path[] = []

  try {
    for (const pathInfo of pathsWithPriority) {
      const { path, hasStroke, isCanvasSize } = pathInfo

      if (isCanvasSize) continue // 跳过画布大小的路径

      // 创建临时填充版本进行包含测试
      const tempPath = path.clone({ insert: false })
      tempPaths.push(tempPath)

      if (!tempPath.fillColor) {
        tempPath.fillColor = new paper.Color('#000000')
      }

      if (tempPath.contains(point)) {
        // 检查是否有边框且点击在边框上
        if (hasStroke) {
          // 使用更精确的边框检测
          const strokeWidth = path.strokeWidth || 1
          const hitResult = path.hitTest(point, {
            stroke: true,
            tolerance: strokeWidth + 2
          })

          // 如果点击在边框上，优先填充边框颜色
          if (hitResult && hitResult.type === 'stroke') {
            const currentStrokeColor = path.strokeColor?.toCSS(true)
            const newColor = canvasColor.value

            if (currentStrokeColor === newColor) {
              // 清理临时路径后返回
              for (const tp of tempPaths) tp.remove()
              return
            }

            path.strokeColor = new paper.Color(newColor)
            updatePathsWithHistory()
            // 清理临时路径后返回
            for (const tp of tempPaths) tp.remove()
            return
          }
        }

        // 否则填充路径内部
        const currentFillColor = path.fillColor?.toCSS(true)
        const newColor = canvasColor.value

        if (currentFillColor === newColor) {
          // 清理临时路径后返回
          for (const tp of tempPaths) tp.remove()
          return
        }

        path.fillColor = new paper.Color(newColor)
        updatePathsWithHistory()
        // 清理临时路径后返回
        for (const tp of tempPaths) tp.remove()
        return
      }
    }

    // 清理所有临时路径
    for (const tempPath of tempPaths) {
      tempPath.remove()
    }
  } catch (error) {
    console.error('直接路径填充出错:', error)
    // 紧急清理临时路径
    for (const tempPath of tempPaths) {
      try {
        tempPath.remove()
      } catch (cleanupError) {
        console.warn('清理临时路径时出错:', cleanupError)
      }
    }
  }

  // --- 步骤 3: 优化的区域填充算法 ---
  const boundaryPaths = allPaths.filter((path) => {
    const hasVisualContent = path.strokeColor || path.fillColor
    const isFullCanvasSize =
      Math.abs(path.bounds.x - 0) < 1 &&
      Math.abs(path.bounds.y - 0) < 1 &&
      Math.abs(path.bounds.width - props.canvasWidth) < 1 &&
      Math.abs(path.bounds.height - props.canvasHeight) < 1

    return hasVisualContent && (!isFullCanvasSize || path.strokeColor)
  })

  if (boundaryPaths.length === 0) {
    return
  }

  // 使用更高效的区域检测算法
  const targetRegion = findOptimalFillRegion(point, boundaryPaths)

  if (targetRegion) {
    const newFillPath = targetRegion.clone({ insert: false }) as paper.Path
    newFillPath.fillColor = new paper.Color(canvasColor.value)
    newFillPath.strokeColor = null

    // 插入到相关边界路径的合适位置
    const insertIndex = findOptimalInsertIndex(boundaryPaths, targetRegion)
    paper.project.activeLayer.insertChild(insertIndex, newFillPath)

    targetRegion.remove()
    updatePathsWithHistory()
  }
}

/**
 * 寻找最优填充区域的高效算法（内存安全版本）
 */
const findOptimalFillRegion = (point: paper.Point, boundaryPaths: paper.Path[]): paper.PathItem | null => {
  const createdPaths: paper.PathItem[] = []

  // 创建画布边界
  const canvasBoundary = new paper.Path.Rectangle({
    point: [0, 0],
    size: [props.canvasWidth, props.canvasHeight]
  })
  createdPaths.push(canvasBoundary)

  try {
    // 分批处理边界路径以提高性能
    const batchSize = 5
    let currentRegion = canvasBoundary as paper.PathItem

    for (let i = 0; i < boundaryPaths.length; i += batchSize) {
      const batch = boundaryPaths.slice(i, i + batchSize)

      // 合并当前批次的路径
      let batchUnion: paper.PathItem | null = null
      try {
        for (const path of batch) {
          if (!batchUnion) {
            batchUnion = path.clone({ insert: false })
            createdPaths.push(batchUnion)
          } else {
            const unionResult = batchUnion.unite(path, { insert: false }) as paper.PathItem | null
            if (unionResult) {
              // 从跟踪列表中移除旧的batchUnion
              const oldIndex = createdPaths.indexOf(batchUnion)
              if (oldIndex >= 0) createdPaths.splice(oldIndex, 1)

              batchUnion.remove()
              batchUnion = unionResult
              createdPaths.push(batchUnion)
            }
          }
        }

        // 从当前区域减去批次联合
        if (batchUnion) {
          const subtractResult = currentRegion.subtract(batchUnion, { insert: false })
          if (subtractResult) {
            // 如果currentRegion不是原始canvasBoundary，才移除
            if (currentRegion !== canvasBoundary) {
              const oldIndex = createdPaths.indexOf(currentRegion)
              if (oldIndex >= 0) createdPaths.splice(oldIndex, 1)
              currentRegion.remove()
            }

            currentRegion = subtractResult
            createdPaths.push(currentRegion)
          }

          // 清理batchUnion
          const batchIndex = createdPaths.indexOf(batchUnion)
          if (batchIndex >= 0) createdPaths.splice(batchIndex, 1)
          batchUnion.remove()
          batchUnion = null
        }
      } catch (batchError) {
        console.error('批处理出错:', batchError)
        // 清理当前批次的临时对象
        if (batchUnion) {
          const batchIndex = createdPaths.indexOf(batchUnion)
          if (batchIndex >= 0) createdPaths.splice(batchIndex, 1)
          batchUnion.remove()
        }
        continue
      }
    }

    // 在结果中寻找包含点击点的最小区域
    let result: paper.PathItem | null = null

    if (currentRegion instanceof paper.CompoundPath) {
      let bestRegion: paper.PathItem | null = null
      let smallestArea = Infinity

      for (const child of currentRegion.children) {
        const childPath = child as paper.PathItem
        if (childPath.contains(point)) {
          const area = childPath.bounds.width * childPath.bounds.height
          const canvasArea = props.canvasWidth * props.canvasHeight

          // 过滤掉过大的区域
          if (area < canvasArea * 0.6 && area < smallestArea) {
            bestRegion = childPath
            smallestArea = area
          }
        }
      }

      if (bestRegion) {
        result = bestRegion.clone({ insert: false })
      }
    } else if (currentRegion.contains(point)) {
      const area = currentRegion.bounds.width * currentRegion.bounds.height
      const canvasArea = props.canvasWidth * props.canvasHeight

      if (area < canvasArea * 0.6) {
        // 如果currentRegion是我们要返回的结果，从跟踪列表中移除避免被清理
        const resultIndex = createdPaths.indexOf(currentRegion)
        if (resultIndex >= 0) {
          createdPaths.splice(resultIndex, 1)
          result = currentRegion
        }
      }
    }

    // 清理所有创建的临时路径
    for (const path of createdPaths) {
      try {
        path.remove()
      } catch (cleanupError) {
        console.warn('清理路径时出错:', cleanupError)
      }
    }

    return result
  } catch (error) {
    console.error('区域填充算法出错:', error)

    // 紧急清理：确保所有创建的路径都被清理
    for (const path of createdPaths) {
      try {
        path.remove()
      } catch (cleanupError) {
        console.warn('紧急清理路径时出错:', cleanupError)
      }
    }

    return null
  }
}

/**
 * 找到最优的插入层级位置
 */
const findOptimalInsertIndex = (boundaryPaths: paper.Path[], targetRegion: paper.PathItem): number => {
  // 找到与目标区域相交的边界路径的最低索引
  let minIndex = 0

  for (let i = 0; i < boundaryPaths.length; i++) {
    const path = boundaryPaths[i]
    if (targetRegion.bounds.intersects(path.bounds)) {
      const pathIndex = paper.project.activeLayer.children.indexOf(path)
      if (pathIndex >= 0) {
        minIndex = Math.max(minIndex, pathIndex)
      }
    }
  }

  return minIndex
}

// 处理画布点击事件
const handleCanvasClick = (point: paper.Point): void => {
  if (!props.isActive) return

  // 直接执行填充
  smartFill(point)
}

// 监听工具激活状态
watch(
  () => props.isActive,
  (active) => {
    const canvas = paper.view?.element
    if (canvas) {
      if (active) {
        getCanvasElement()
      } else {
        canvas.style.cursor = 'default'
        showCursor.value = false
      }
    }
  }
)

// 组件挂载时获取画布元素
onMounted(() => {
  getCanvasElement()
})

// 清理资源
onUnmounted(() => {
  showCursor.value = false
  canvasElement.value = null
})

// 暴露方法给父组件
defineExpose({
  handleCanvasClick,
  handleMouseEnter,
  handleMouseMove,
  handleMouseLeave
})
</script>

<style scoped lang="scss">
.fill-tool {
  position: relative;
}

.fill-cursor {
  position: fixed;
  border: 2px solid #ff9800;
  border-radius: 4px;
  background: rgba(255, 152, 0, 0.2);
  pointer-events: none;
  z-index: 9999;
  transition: none; // 禁用过渡动画以提高性能

  // 添加油漆桶图标样式
  &::before {
    content: '🪣';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 16px;
    line-height: 1;
  }

  // 备用方案：如果不支持emoji，使用CSS绘制简单图标
  &::after {
    content: '';
    position: absolute;
    top: 3px;
    left: 50%;
    transform: translateX(-50%);
    width: 8px;
    height: 8px;
    border: 1px solid #ff9800;
    border-bottom: 2px solid #ff9800;
    border-radius: 0 0 4px 4px;
    display: none; // 默认隐藏，可以根据需要显示
  }
}
</style>
