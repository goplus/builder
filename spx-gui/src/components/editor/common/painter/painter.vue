<template>
  <div class="painter-container">
    <!-- 左侧工具栏 -->
    <div class="toolbar">
      <div class="tool-section">
        <h3 class="tool-title">绘图工具</h3>
        <button 
          :class="['tool-btn', { active: currentTool === 'line' }]"
          @click="selectTool('line')"
          title="直线工具"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="7" y1="17" x2="17" y2="7"></line>
          </svg>
          <span>直线</span>
        </button>
        
        <button 
          :class="['tool-btn', { active: currentTool === 'select' }]"
          @click="selectTool('select')"
          title="选择工具"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"></path>
            <path d="m13 13 6 6"></path>
          </svg>
          <span>变形</span>
        </button>
      </div>
      
      <div class="tool-section">
        <h3 class="tool-title">操作</h3>
        <button class="tool-btn action-btn" @click="clearCanvas" title="清空画布">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3,6 5,6 21,6"></polyline>
            <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
          </svg>
          <span>清空</span>
        </button>
      </div>
    </div>

    <!-- 画布区域 -->
    <div class="canvas-wrapper">
      <canvas 
        ref="canvasRef" 
        :width="canvasWidth" 
        :height="canvasHeight"
        @click="handleCanvasClick"
        @mousedown="handleMouseDown"
        @mousemove="handleMouseMove"
      ></canvas>
      
      <!-- 直线绘制组件 -->
      <DrawLine
        ref="drawLineRef"
        :canvas-width="canvasWidth"
        :canvas-height="canvasHeight"
        :is-active="currentTool === 'line'"
        @line-created="handleLineCreated"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import paper from 'paper'
import DrawLine from './components/draw_line.vue'

// 工具类型
type ToolType = 'line' | 'select'

// TypeScript 接口定义
interface ExtendedItem extends paper.Item {
  isControlPoint?: boolean
  segmentIndex?: number
  parentPath?: paper.Path
}

interface Point {
  x: number
  y: number
}

// 响应式变量
const canvasRef = ref<HTMLCanvasElement | null>(null)
const canvasWidth = ref<number>(800)
const canvasHeight = ref<number>(600)

// 工具状态
const currentTool = ref<ToolType>('line')
const drawLineRef = ref<InstanceType<typeof DrawLine> | null>(null)

// 状态管理
const isDragging = ref<boolean>(false)
const selectedPoint = ref<ExtendedItem | null>(null)
const allPaths = ref<paper.Path[]>([])
const controlPoints = ref<ExtendedItem[]>([])

// 初始化 Paper.js
const initPaper = (): void => {
  if (!canvasRef.value) return
  
  paper.setup(canvasRef.value)
  
  // 设置画布背景
  const background = new paper.Path.Rectangle({
    point: [0, 0],
    size: [canvasWidth.value, canvasHeight.value],
    fillColor: '#ffffff'
  })
  
  // 使用 update() 替代 draw()
  paper.view.update()
}

// 选择工具
const selectTool = (tool: ToolType): void => {
  currentTool.value = tool
  
  // 重置直线绘制状态
  if (drawLineRef.value) {
    drawLineRef.value.resetDrawing()
  }
  
  hideControlPoints()
}

// 处理直线创建
const handleLineCreated = (line: paper.Path): void => {
  allPaths.value.push(line)
  paper.view.update()
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
    point.scale(1.25) // 放大控制点
    paper.view.update()
  }
  
  point.onMouseLeave = () => {
    point.fillColor = new paper.Color('#ff4444')
    point.scale(0.8) // 恢复原始大小
    paper.view.update()
  }
  
  return point
}

// 显示路径的控制点
const showControlPoints = (path: paper.Path): void => {
  hideControlPoints()
  
  if (path && path.segments) {
    path.segments.forEach((segment: paper.Segment, index: number) => {
      const controlPoint = createControlPoint(segment.point)
      controlPoint.segmentIndex = index
      controlPoint.parentPath = path
      controlPoints.value.push(controlPoint)
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
}

// 检测点击的路径
const getPathAtPoint = (point: paper.Point): paper.Path | null => {
  const hitResult = paper.project.hitTest(point, {
    segments: false,
    stroke: true,
    fill: false,
    tolerance: 12
  })
  
  if (hitResult && hitResult.item && !(hitResult.item as ExtendedItem).isControlPoint) {
    return hitResult.item as paper.Path
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

// 局部平滑函数：只影响当前点及其相邻的线段
const smoothLocalSegments = (path: paper.Path, segmentIndex: number): void => {
  const segments = path.segments
  const currentSegment = segments[segmentIndex]
  
  if (!currentSegment) return
  
  // 计算影响范围：前一个点到后一个点
  const prevIndex = Math.max(0, segmentIndex - 1)
  const nextIndex = Math.min(segments.length - 1, segmentIndex + 1)
  
  // 如果是端点，使用不同的处理方式
  if (segmentIndex === 0 || segmentIndex === segments.length - 1) {
    // 端点：只影响连接的那一段
    if (segmentIndex === 0 && segments.length > 1) {
      // 起始端点
      const nextSeg = segments[1]
      calculateLocalHandles(currentSegment, nextSeg, null)
    } else if (segmentIndex === segments.length - 1 && segments.length > 1) {
      // 结束端点
      const prevSeg = segments[segments.length - 2]
      calculateLocalHandles(currentSegment, null, prevSeg)
    }
  } else {
    // 中间点：影响前后两段
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
  // 清除现有的控制点
  currentSeg.clearHandles()
  
  if (nextSeg && prevSeg) {
    // 中间点：计算平滑的控制点
    const vector1 = currentSeg.point.subtract(prevSeg.point)
    const vector2 = nextSeg.point.subtract(currentSeg.point)
    
    // 计算控制点方向和长度
    const angle1 = vector1.angle
    const angle2 = vector2.angle
    const avgAngle = (angle1 + angle2) / 2
    
    const length1 = vector1.length * 0.3
    const length2 = vector2.length * 0.3
    
    // 设置控制点
    currentSeg.handleIn = new paper.Point({
      angle: avgAngle + 180,
      length: length1
    })
    currentSeg.handleOut = new paper.Point({
      angle: avgAngle,
      length: length2
    })
  } else if (nextSeg) {
    // 起始点：只设置出控制点
    const vector = nextSeg.point.subtract(currentSeg.point)
    currentSeg.handleOut = vector.multiply(0.3)
  } else if (prevSeg) {
    // 结束点：只设置入控制点
    const vector = currentSeg.point.subtract(prevSeg.point)
    currentSeg.handleIn = vector.multiply(0.3)
  }
}

// 在路径上添加新的控制点
const addControlPointOnPath = (path: paper.Path, clickPoint: paper.Point): void => {
  const location = path.getNearestLocation(clickPoint)
  if (location) {
    // 在最近的位置分割路径，创建新的段点
    const newSegment = path.insert(location.index + 1, location.point)
    
    // 局部平滑新添加的点及其相邻区域
    smoothLocalSegments(path, location.index + 1)
    
    // 重新显示控制点
    showControlPoints(path)
    paper.view.update()
  }
}

// 鼠标按下事件（用于开始拖拽控制点）
const handleMouseDown = (event: MouseEvent): void => {
  if (currentTool.value !== 'select') return
  
  const rect = canvasRef.value?.getBoundingClientRect()
  if (!rect) return
  
  const point = new paper.Point(
    event.clientX - rect.left,
    event.clientY - rect.top
  )
  
  // 检查是否点击了控制点
  const controlPoint = getControlPointAtPoint(point)
  if (controlPoint) {
    isDragging.value = true
    selectedPoint.value = controlPoint
    // 阻止事件冒泡，避免触发 click 事件
    event.preventDefault()
    event.stopPropagation()
  }
}

// 画布点击事件
const handleCanvasClick = (event: MouseEvent): void => {
  const rect = canvasRef.value?.getBoundingClientRect()
  if (!rect) return
  
  const point = new paper.Point(
    event.clientX - rect.left,
    event.clientY - rect.top
  )
  
  if (currentTool.value === 'line') {
    // 委托给 DrawLine 组件处理
    if (drawLineRef.value) {
      drawLineRef.value.handleCanvasClick({ x: point.x, y: point.y })
    }
  } else if (currentTool.value === 'select') {
    // 检查是否点击了控制点（优先级最高）
    const controlPoint = getControlPointAtPoint(point)
    if (controlPoint) {
      // 不在这里设置拖拽状态，由 mousedown 处理
      return
    }
    
    // 检查是否点击了现有路径
    const clickedPath = getPathAtPoint(point)
    if (clickedPath) {
      // 直接在点击位置添加控制点
      addControlPointOnPath(clickedPath, point)
      return
    }
    
    // 点击空白区域，隐藏控制点
    hideControlPoints()
    paper.view.update()
  }
}

// 鼠标移动事件
const handleMouseMove = (event: MouseEvent): void => {
  const rect = canvasRef.value?.getBoundingClientRect()
  if (!rect) return
  
  const point = new paper.Point(
    event.clientX - rect.left,
    event.clientY - rect.top
  )
  
  // 委托给 DrawLine 组件处理预览
  if (currentTool.value === 'line' && drawLineRef.value) {
    drawLineRef.value.handleMouseMove({ x: point.x, y: point.y })
  }
  
  // 拖拽控制点
  if (isDragging.value && selectedPoint.value) {
    selectedPoint.value.position = point
    
    // 更新对应的路径段点
    if (selectedPoint.value.parentPath && selectedPoint.value.segmentIndex !== undefined) {
      const segment = selectedPoint.value.parentPath.segments[selectedPoint.value.segmentIndex]
      if (segment) {
        segment.point = point
        
        // 局部平滑：只影响相邻的线段
        smoothLocalSegments(selectedPoint.value.parentPath, selectedPoint.value.segmentIndex)
      }
    }
    
    paper.view.update()
  }
}

// 鼠标释放事件（用于结束拖拽）
const handleMouseUp = (): void => {
  if (isDragging.value) {
    isDragging.value = false
    selectedPoint.value = null
  }
}

// 清空画布
const clearCanvas = (): void => {
  hideControlPoints()
  allPaths.value.forEach((path: paper.Path) => {
    if (path && path.parent) {
      path.remove()
    }
  })
  allPaths.value = []
  
  // 重置直线绘制状态
  if (drawLineRef.value) {
    drawLineRef.value.resetDrawing()
  }
  
  paper.project.clear()
  
  // 重新创建背景
  const background = new paper.Path.Rectangle({
    point: [0, 0],
    size: [canvasWidth.value, canvasHeight.value],
    fillColor: '#ffffff'
  })
  
  paper.view.update()
}

onMounted(() => {
  initPaper()
  
  // 添加键盘事件监听
  const handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      hideControlPoints()
      if (drawLineRef.value) {
        drawLineRef.value.resetDrawing()
      }
      paper.view.update()
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      // 删除选中的路径
      if (controlPoints.value.length > 0 && controlPoints.value[0].parentPath) {
        const pathToDelete = controlPoints.value[0].parentPath
        pathToDelete.remove()
        allPaths.value = allPaths.value.filter((path: paper.Path) => path !== pathToDelete)
        hideControlPoints()
        paper.view.update()
      }
    }
  }
  
  // 添加鼠标释放事件监听
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('mouseup', handleMouseUp)
  
  // 清理函数
  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
    window.removeEventListener('mouseup', handleMouseUp)
  })
})
</script>

<style scoped>
.painter-container {
  display: flex;
  height: 100%;
  width: 100%;
  background-color: #f5f5f5;
}

/* 工具栏样式 */
.toolbar {
  width: 200px;
  background-color: #ffffff;
  border-right: 1px solid #e0e0e0;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
}

.tool-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tool-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin: 0 0 8px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid #e0e0e0;
}

.tool-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background-color: #fff;
  color: #666;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
  text-align: left;
}

.tool-btn:hover {
  background-color: #f8f9fa;
  border-color: #2196f3;
  color: #2196f3;
}

.tool-btn.active {
  background-color: #e3f2fd;
  border-color: #2196f3;
  color: #2196f3;
}

.tool-btn.action-btn {
  background-color: #fff3e0;
  border-color: #ff9800;
  color: #ff9800;
}

.tool-btn.action-btn:hover {
  background-color: #ffe0b2;
  border-color: #f57c00;
  color: #f57c00;
}

.tool-btn svg {
  flex-shrink: 0;
}

.tool-btn span {
  font-weight: 500;
}

/* 画布区域样式 */
.canvas-wrapper {
  flex: 1;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

canvas {
  border: 2px solid #ddd;
  border-radius: 8px;
  background-color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 1;
}

canvas:hover {
  border-color: #2196f3;
}



/* 响应式设计 */
@media (max-width: 768px) {
  .painter-container {
    flex-direction: column;
  }
  
  .toolbar {
    width: 100%;
    flex-direction: row;
    padding: 12px;
    gap: 12px;
    overflow-x: auto;
  }
  
  .tool-section {
    flex-direction: row;
    min-width: fit-content;
  }
  
  .tool-title {
    writing-mode: vertical-rl;
    text-orientation: mixed;
    min-width: 40px;
    border-bottom: none;
    border-right: 1px solid #e0e0e0;
    padding-right: 8px;
    margin-right: 8px;
  }
  
  .canvas-wrapper {
    padding: 12px;
  }
}
</style>
