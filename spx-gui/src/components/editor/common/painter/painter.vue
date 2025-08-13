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
          :class="['tool-btn', { active: currentTool === 'brush' }]"
          @click="selectTool('brush')"
          title="笔刷工具"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"></path>
            <path d="m7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08-2 2.51-2 2.68-2.02 0.44 0 3.34-1.66 3.34-3.02z"></path>
          </svg>
          <span>笔刷</span>
        </button>
        
        <button 
          :class="['tool-btn', { active: currentTool === 'reshape' }]"
          @click="selectTool('reshape')"
          title="变形工具"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"></path>
            <path d="m13 13 6 6"></path>
          </svg>
          <span>变形</span>
        </button>
      </div>
      
      <div class="tool-section">
        <h3 class="tool-title">AI工具</h3>
        <button class="tool-btn ai-btn" @click="showAiDialog" title="AI生成图片">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 12l2 2 4-4"></path>
            <path d="M21 12c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1z"></path>
            <path d="M3 12c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1z"></path>
            <path d="M12 21c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1z"></path>
            <path d="M12 3c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1z"></path>
            <path d="M18.364 18.364c.39.39 1.024.39 1.414 0s.39-1.024 0-1.414-.024-.39-1.414 0-.39 1.024 0 1.414z"></path>
            <path d="M4.222 4.222c.39.39 1.024.39 1.414 0s.39-1.024 0-1.414-1.024-.39-1.414 0-.39 1.024 0 1.414z"></path>
            <path d="M18.364 5.636c.39-.39.39-1.024 0-1.414s-1.024-.39-1.414 0-.39 1.024 0 1.414 1.024.39 1.414 0z"></path>
            <path d="M4.222 19.778c.39-.39.39-1.024 0-1.414s-1.024-.39-1.414 0-.39 1.024 0 1.414 1.024.39 1.414 0z"></path>
          </svg>
          <span>AI生成</span>
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
        @mouseup="handleCanvasMouseUp"
      ></canvas>
      
      <!-- 直线绘制组件 -->
      <DrawLine
        ref="drawLineRef"
        :canvas-width="canvasWidth"
        :canvas-height="canvasHeight"
        :is-active="currentTool === 'line'"
        @line-created="handleLineCreated"
      />
      
      <!-- 笔刷绘制组件 -->
      <DrawBrush
        ref="drawBrushRef"
        :canvas-width="canvasWidth"
        :canvas-height="canvasHeight"
        :is-active="currentTool === 'brush'"
        @path-created="handlePathCreated"
      />
    </div>
    
    <!-- AI生成弹窗 -->
    <AiGenerate 
      v-model:visible="aiDialogVisible"
      @confirm="handleAiConfirm"
      @cancel="handleAiCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import paper from 'paper'
import DrawLine from './components/draw_line.vue'
import DrawBrush from './components/draw_brush.vue'
import AiGenerate from './components/ai_generate.vue'

// 工具类型
type ToolType = 'line' | 'brush' | 'reshape'

// TypeScript 接口定义
interface ExtendedItem extends paper.Item {
  isControlPoint?: boolean
  isTemporaryControlPoint?: boolean
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
const currentTool = ref<ToolType | null>(null)
const drawLineRef = ref<InstanceType<typeof DrawLine> | null>(null)
const drawBrushRef = ref<InstanceType<typeof DrawBrush> | null>(null)
// 状态管理
const isDragging = ref<boolean>(false)
const selectedPoint = ref<ExtendedItem | null>(null)
const allPaths = ref<paper.Path[]>([])
const controlPoints = ref<ExtendedItem[]>([])
const mouseDownPath = ref<paper.Path | null>(null)
const mouseDownPos = ref<paper.Point | null>(null)
const imgSrc = ref<string | null>(null)
const imgLoading = ref<boolean>(true)

// 存储背景图片的引用
const backgroundImage = ref<paper.Raster | null>(null)

// AI生成弹窗状态
const aiDialogVisible = ref<boolean>(false)

const props = defineProps<{
  imgSrc: string | null
  imgLoading: boolean
}>()

// 选中路径（独占选择）
const selectPathExclusive = (path: paper.Path | null): void => {
  allPaths.value.forEach((p: paper.Path) => {
    p.selected = false
  })
  if (path) {
    path.selected = true
  }
}

// 加载图片到画布
const loadImageToCanvas = (imageSrc: string): void => {
  if (!paper.project) return
  
  // 如果已有背景图片，先移除
  if (backgroundImage.value) {
    backgroundImage.value.remove()
  }
  
  // 创建新的光栅图像
  const raster = new paper.Raster(imageSrc)
  
  raster.onLoad = () => {
    // 图片加载完成后的处理
    // 设置图片位置到画布中心
    raster.position = paper.view.center
    
    // 可选：调整图片大小适应画布
    const scale = Math.min(
      canvasWidth.value / raster.width,
      canvasHeight.value / raster.height
    ) * 0.8 // 留一些边距
    
    if (scale < 1) {
      raster.scale(scale)
    }
    
    // 将图片放到最底层，作为背景
    raster.sendToBack()
    
    // 保存引用
    backgroundImage.value = raster
    
    // 更新视图
    paper.view.update()
  }

  // raster.onMouseDown = (event: paper.MouseEvent) => {
    // if (currentTool.value === 'reshape') {
    //   selectPathExclusive(null) // 清除路径选择
    //   raster.selected = true
    //   paper.view.update()
    // }
  // }
}

// 初始化 Paper.js
const initPaper = (): void => {
  if (!canvasRef.value) return
  
  paper.setup(canvasRef.value)
  
  // 设置画布背景
  const background = new paper.Path.Rectangle({
    point: [0, 0],
    size: [canvasWidth.value, canvasHeight.value],
    fillColor: 'transparent'
  })
  
  // 如果有初始图片，加载它
  if (props.imgSrc) {
    loadImageToCanvas(props.imgSrc)
  }
  
  paper.view.update()
}

// 选择工具
const selectTool = (tool: ToolType): void => {
  currentTool.value = tool
  
  // 重置直线绘制状态
  if (drawLineRef.value) {
    drawLineRef.value.resetDrawing()
  }
  
  // 重置笔刷绘制状态
  if (drawBrushRef.value) {
    drawBrushRef.value.resetDrawing()
  }
  
  hideControlPoints()
}

// 处理直线创建
const handleLineCreated = (line: paper.Path): void => {
  allPaths.value.push(line)
  paper.view.update()
}

// 处理笔刷路径创建
const handlePathCreated = (path: paper.Path): void => {
  allPaths.value.push(path)
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
  selectPathExclusive(path)
  
  // console.log('显示控制点 - 路径类型:', path.constructor.name, '路径:', path)
  
  if (path && path.segments) {
    // console.log('路径段数:', path.segments.length)
    path.segments.forEach((segment: paper.Segment, index: number) => {
      const controlPoint = createControlPoint(segment.point)
      controlPoint.segmentIndex = index
      controlPoint.parentPath = path
      controlPoints.value.push(controlPoint)
    })
  } else if (path instanceof paper.CompoundPath) {
    // 处理复合路径
    // console.log('处理复合路径')
    path.children.forEach((child: paper.Item, childIndex: number) => {
      if (child instanceof paper.Path && child.segments) {
        child.segments.forEach((segment: paper.Segment, segIndex: number) => {
          const controlPoint = createControlPoint(segment.point)
          controlPoint.segmentIndex = segIndex
          controlPoint.parentPath = child as paper.Path
          controlPoints.value.push(controlPoint)
        })
      }
    })
  } else {
    // console.warn('路径对象没有segments属性:', path)
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
  // 同时取消路径高亮
  allPaths.value.forEach((p: paper.Path) => {
    p.selected = false
  })
  if (paper.project) {
    paper.project.deselectAll()
  }
}

// 检测点击的路径
const getPathAtPoint = (point: paper.Point): paper.Path | null => {
  // 扩大检测范围，同时检测填充和描边
  const hitResult = paper.project.hitTest(point, {
    segments: false,
    stroke: true,
    fill: true, // 也检测填充区域
    tolerance: 15 // 增加容差
  })
  
  if (hitResult && hitResult.item && !(hitResult.item as ExtendedItem).isControlPoint) {
    let targetItem = hitResult.item
    
    // 如果点击的是组内的对象，需要找到实际的路径对象
    while (targetItem.parent && targetItem.parent !== paper.project.activeLayer) {
      targetItem = targetItem.parent
    }
    
    // 检查是否在allPaths数组中
    const pathInArray = allPaths.value.find(path => path === targetItem || path === hitResult.item)
    if (pathInArray) {
      return pathInArray
    }
    
    // 如果是Path或CompoundPath类型，返回原始点击的对象
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

// 在路径上添加新的控制点，并返回对应的控制点实例
const addControlPointOnPath = (path: paper.Path, clickPoint: paper.Point): ExtendedItem | null => {
  const location = path.getNearestLocation(clickPoint)
  if (location) {
    // 在最近的位置分割路径，创建新的段点
    const insertIndex = location.index + 1
    path.insert(insertIndex, location.point)

    // 局部平滑新添加的点及其相邻区域
    smoothLocalSegments(path, insertIndex)

    // 重新显示控制点
    showControlPoints(path)
    
    // 返回新创建段点对应的控制点实例
    const created = controlPoints.value.find((p: ExtendedItem) => p.parentPath === path && p.segmentIndex === insertIndex) || null
    paper.view.update()
    return created
  }
  return null
}

// 鼠标按下事件（变形-用于开始拖拽控制点）
const handleMouseDown = (event: MouseEvent): void => {
  // console.log('handleMouseDown')
  const rect = canvasRef.value?.getBoundingClientRect()
  if (!rect) return
  
  const point = new paper.Point(
    event.clientX - rect.left,
    event.clientY - rect.top
  )
  
  // 处理笔刷工具
  if (currentTool.value === 'brush' && drawBrushRef.value) {
    drawBrushRef.value.handleMouseDown({ x: point.x, y: point.y })
    return
  }
  
  if (currentTool.value !== 'reshape') return
  
  // 检查是否点击了控制点
  const controlPoint = getControlPointAtPoint(point)
  if (controlPoint) {
    isDragging.value = true
    selectedPoint.value = controlPoint
    return
  }

  // 若未点到控制点，则检测是否按在某个路径上（不立即创建临时点，等拖拽阈值触发）
  const clickedPath = getPathAtPoint(point)
  if (clickedPath) {
    mouseDownPath.value = clickedPath
    mouseDownPos.value = point
  } else {
    mouseDownPath.value = null
    mouseDownPos.value = null
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
  } else if (currentTool.value === 'reshape') {
    // 检查是否点击了控制点（优先级最高）
    const controlPoint = getControlPointAtPoint(point)
    if (controlPoint) {
      // console.log('controlPoint', controlPoint)
      // 不在这里设置拖拽状态，由 mousedown 处理
      return
    }
    
    // 检查是否点击了现有路径
    const clickedPath = getPathAtPoint(point)
    if (clickedPath) {
      // console.log('clickedPath', clickedPath)
      // 仅选中并显示端点（不新增控制点）
      showControlPoints(clickedPath)
      paper.view.update()
      return
    }
    
    // 点击空白区域，隐藏控制点
    // console.log('hideControlPoints')
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
  
  // 委托给 DrawBrush 组件处理拖拽
  if (currentTool.value === 'brush' && drawBrushRef.value) {
    drawBrushRef.value.handleMouseDrag({ x: point.x, y: point.y })
  }
  
  // 若按在路径上且尚未开始拖拽，当移动超过阈值时，创建临时控制点并进入拖拽
  if (
    currentTool.value === 'reshape' &&
    !isDragging.value &&
    mouseDownPath.value &&
    mouseDownPos.value
  ) {
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

// 画布鼠标释放事件
const handleCanvasMouseUp = (event: MouseEvent): void => {
  const rect = canvasRef.value?.getBoundingClientRect()
  if (!rect) return
  
  const point = new paper.Point(
    event.clientX - rect.left,
    event.clientY - rect.top
  )
  
  // 处理笔刷工具
  if (currentTool.value === 'brush' && drawBrushRef.value) {
    drawBrushRef.value.handleMouseUp({ x: point.x, y: point.y })
    return
  }
}

// 鼠标释放事件（用于结束拖拽）
const handleMouseUp = (): void => {
  const prevSelected = selectedPoint.value
  if (isDragging.value) {
    isDragging.value = false
    selectedPoint.value = null
  }

  // 清理按下状态
  const prevMouseDownPath = mouseDownPath.value
  mouseDownPath.value = null
  mouseDownPos.value = null

  // 若为临时控制点，则在松开时删除该控制点，并刷新端点显示
  if (prevSelected && (prevSelected as ExtendedItem).isTemporaryControlPoint) {
    if (prevSelected.parent) {
      prevSelected.remove()
    }
    controlPoints.value = controlPoints.value.filter((p: ExtendedItem) => p !== prevSelected)

    // 重新显示该路径的所有端点（包含新插入的段点）
    if (prevSelected.parentPath) {
      showControlPoints(prevSelected.parentPath)
    } else if (prevMouseDownPath) {
      showControlPoints(prevMouseDownPath)
    }
    paper.view.update()
  }
}

// 显示AI生成弹窗
const showAiDialog = (): void => {
  aiDialogVisible.value = true
}

// 处理AI生成确认
const handleAiConfirm = (data: { 
  model: string; 
  prompt: string; 
  url?: string; 
  svgContent?: string;
}): void => {
  // console.log('AI生成确认:', data)
  
  if (data.model === 'svg' && data.svgContent) {
    // 处理SVG导入
    importSvgToCanvas(data.svgContent)
  } else if (data.model === 'png' && data.url) {
    // 处理PNG图片导入
    importImageToCanvas(data.url)
  }
  
  aiDialogVisible.value = false
}

// 处理AI生成取消
const handleAiCancel = (): void => {
  // console.log('AI生成取消')
  aiDialogVisible.value = false
}

// 导入PNG图片到画布
const importImageToCanvas = (imageUrl: string): void => {
  if (!paper.project) return
  
  // 创建新的光栅图像
  const raster = new paper.Raster(imageUrl)
  
  raster.onLoad = () => {
    // 图片加载完成后的处理
    // 设置图片位置到画布中心
    raster.position = paper.view.center
    
    // 调整图片大小适应画布
    const scale = Math.min(
      canvasWidth.value / raster.width * 0.6,
      canvasHeight.value / raster.height * 0.6
    )
    
    if (scale < 1) {
      raster.scale(scale)
    }
    
    // 添加点击事件处理
    // raster.onMouseDown = (event: paper.MouseEvent) => {
    //   if (currentTool.value === 'reshape') {
    //     selectPathExclusive(null) // 清除路径选择
    //     raster.selected = true
    //     paper.view.update()
    //   }
    // }
    
    // 更新视图
    paper.view.update()
    // console.log('PNG图片已导入到画布')
  }
  
  raster.onError = () => {
    console.error('图片加载失败')
  }
}

// 导入SVG到画布并转换为可编辑的路径
const importSvgToCanvas = (svgContent: string): void => {
  if (!paper.project) return
  
  try {
    // 创建一个临时的SVG元素来解析SVG内容
    const parser = new DOMParser()
    const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml')
    const svgElement = svgDoc.documentElement
    
    // 检查是否解析成功
    if (svgElement.nodeName !== 'svg') {
      console.error('无效的SVG内容')
      return
    }
    
    // 使用Paper.js导入SVG
    const importedItem = paper.project.importSVG(svgElement as unknown as SVGElement)
    
    if (importedItem) {
      // 设置位置到画布中心
      importedItem.position = paper.view.center
      
      // 调整大小适应画布
      const bounds = importedItem.bounds
      const scale = Math.min(
        canvasWidth.value / bounds.width * 0.6,
        canvasHeight.value / bounds.height * 0.6
      )
      
      if (scale < 1) {
        importedItem.scale(scale)
      }
      
      // 收集所有可编辑的路径
      // const collectPaths = (item: paper.Item): void => {
      //   if (item instanceof paper.Path && item.segments && item.segments.length > 0) {
      //     // 添加到可编辑路径列表
      //     allPaths.value.push(item)
          
      //     // 添加鼠标事件处理
      //     item.onMouseDown = (event: paper.MouseEvent) => {
      //       if (currentTool.value === 'reshape') {
      //         showControlPoints(item)
      //         paper.view.update()
      //       }
      //     }
      //   } else if (item instanceof paper.Group || item instanceof paper.CompoundPath) {
      //     // 递归处理子项
      //     if (item.children) {
      //       item.children.forEach(child => collectPaths(child))
      //     }
      //   }
      // }
      
      // 收集导入的所有路径
      // collectPaths(importedItem)
      
      // 更新视图
      paper.view.update()
      // console.log(`SVG已导入到画布，共${allPaths.value.length - (allPaths.value.length - countNewPaths(importedItem))}条可编辑路径`)
    }
  } catch (error) {
    console.error('SVG导入失败:', error)
  }
}

// 辅助函数：计算新导入的路径数量
// const countNewPaths = (item: paper.Item): number => {
//   let count = 0
  
//   const countPathsRecursive = (item: paper.Item): void => {
//     if (item instanceof paper.Path && item.segments && item.segments.length > 0) {
//       count++
//     } else if (item instanceof paper.Group || item instanceof paper.CompoundPath) {
//       if (item.children) {
//         item.children.forEach(child => countPathsRecursive(child))
//       }
//     }
//   }
  
//   countPathsRecursive(item)
//   return count
// }



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
  
  // 重置笔刷绘制状态
  if (drawBrushRef.value) {
    drawBrushRef.value.resetDrawing()
  }
  
  paper.project.clear()
  
  // 重新创建背景
  const background = new paper.Path.Rectangle({
    point: [0, 0],
    size: [canvasWidth.value, canvasHeight.value],
    fillColor: 'transparent'
  })
  
  paper.view.update()
}

// 监听props中的imgSrc变化
watch(() => props.imgSrc, (newImgSrc) => {
  if (newImgSrc) {
    loadImageToCanvas(newImgSrc)
  }
}, { immediate: true })

onMounted(() => {
  initPaper()
  
  // 添加键盘事件监听
  const handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      hideControlPoints()
      if (drawLineRef.value) {
        drawLineRef.value.resetDrawing()
      }
      if (drawBrushRef.value) {
        drawBrushRef.value.resetDrawing()
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

.tool-btn.ai-btn {
  background-color: #f3e5f5;
  border-color: #9c27b0;
  color: #9c27b0;
}

.tool-btn.ai-btn:hover {
  background-color: #e1bee7;
  border-color: #7b1fa2;
  color: #7b1fa2;
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
}

canvas {
  border-radius: 8px;
  background-color: transparent;
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
