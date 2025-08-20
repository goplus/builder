<template>
  <div class="painter-container">
    <!-- 左侧工具栏 -->
    <div class="toolbar">
      <div class="tool-section">
        <h3 class="tool-title">{{ $t({ en: 'Drawing Tools', zh: '绘图工具' }) }}</h3>
        <div class="tool-grid">
          <button 
            :class="['tool-btn', { active: currentTool === 'line' }]"
            @click="selectTool('line')"
            :title="$t({ en: 'Line Tool', zh: '直线工具' })"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="7" y1="17" x2="17" y2="7"></line>
            </svg>
            <span>{{ $t({ en: 'Line', zh: '直线' }) }}</span>
          </button>
          
          <button 
            :class="['tool-btn', { active: currentTool === 'brush' }]"
            @click="selectTool('brush')"
            :title="$t({ en: 'Brush Tool', zh: '笔刷工具' })"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"></path>
              <path d="m7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08-2 2.51-2 2.68-2.02 0.44 0 3.34-1.66 3.34-3.02z"></path>
            </svg>
            <span>{{ $t({ en: 'Brush', zh: '笔刷' }) }}</span>
          </button>
          
          <button 
            :class="['tool-btn', { active: currentTool === 'reshape' }]"
            @click="selectTool('reshape')"
            :title="$t({ en: 'Reshape Tool', zh: '变形工具' })"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"></path>
              <path d="m13 13 6 6"></path>
            </svg>
            <span>{{ $t({ en: 'Reshape', zh: '变形' }) }}</span>
          </button>
          
          <button 
            :class="['tool-btn', { active: currentTool === 'eraser' }]"
            @click="selectTool('eraser')"
            :title="$t({ en: 'Eraser Tool', zh: '橡皮工具' })"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"></path>
              <path d="M22 21H7"></path>
              <path d="m5 11 9 9"></path>
            </svg>
            <span>{{ $t({ en: 'Eraser', zh: '橡皮' }) }}</span>
          </button>
          
          <button 
            :class="['tool-btn', { active: currentTool === 'rectangle' }]"
            @click="selectTool('rectangle')"
            :title="$t({ en: 'Rectangle Tool', zh: '矩形工具' })"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect width="18" height="12" x="3" y="6" rx="2"></rect>
            </svg>
            <span>{{ $t({ en: 'Rectangle', zh: '矩形' }) }}</span>
          </button>
          
          <button 
            :class="['tool-btn', { active: currentTool === 'circle' }]"
            @click="selectTool('circle')"
            :title="$t({ en: 'Circle Tool', zh: '圆形工具' })"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="9"></circle>
            </svg>
            <span>{{ $t({ en: 'Circle', zh: '圆形' }) }}</span>
          </button>
          
          <button 
            :class="['tool-btn', { active: currentTool === 'fill' }]"
            @click="selectTool('fill')"
            :title="$t({ en: 'Fill Tool', zh: '填充颜色工具' })"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 12l2 2 4-4"></path>
              <path d="M21 12c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1z"></path>
              <path d="M3 12c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1z"></path>
              <path d="M12 21c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1z"></path>
              <path d="M12 3c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1z"></path>
            </svg>
            <span>{{ $t({ en: 'Fill', zh: '填充' }) }}</span>
          </button>
          
          <button 
            :class="['tool-btn', { active: currentTool === 'text' }]"
            @click="selectTool('text')"
            :title="$t({ en: 'Text Tool', zh: '插入文本工具' })"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 7V4h16v3"></path>
              <path d="M9 20h6"></path>
              <path d="M12 4v16"></path>
            </svg>
            <span>{{ $t({ en: 'Text', zh: '文本' }) }}</span>
          </button>
        </div>
      </div>
      
      <div class="tool-section">
        <h3 class="tool-title">{{ $t({ en: 'AI Tools', zh: 'AI工具' }) }}</h3>
        <button class="tool-btn ai-btn" @click="showAiDialog" :title="$t({ en: 'AI Generate Image', zh: 'AI生成图片' })">
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
          <span>{{ $t({ en: 'AI Generate', zh: 'AI生成' }) }}</span>
        </button>
      </div>
      
      <div class="tool-section">
        <h3 class="tool-title">{{ $t({ en: 'Actions', zh: '操作' }) }}</h3>
        <button class="tool-btn action-btn" @click="clearCanvas" :title="$t({ en: 'Clear Canvas', zh: '清空画布' })">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3,6 5,6 21,6"></polyline>
            <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
          </svg>
          <span>{{ $t({ en: 'Clear', zh: '清空' }) }}</span>
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
      
      <!-- 变形工具组件 -->
      <Reshape
        ref="reshapeRef"
        :is-active="currentTool === 'reshape'"
        :all-paths="allPaths"
        @paths-update="handlePathsUpdate"
        @svg-export="exportSvgAndEmit"
      />
      
      <!-- 橡皮工具组件 -->
      <EraserTool
        :is-active="currentTool === 'eraser'"
        :canvas-width="canvasWidth"
        :canvas-height="canvasHeight"
      />
      
      <!-- 矩形工具组件 -->
      <RectangleTool
        :is-active="currentTool === 'rectangle'"
        :canvas-width="canvasWidth"
        :canvas-height="canvasHeight"
      />
      
      <!-- 圆形工具组件 -->
      <CircleTool
        :is-active="currentTool === 'circle'"
        :canvas-width="canvasWidth"
        :canvas-height="canvasHeight"
      />
      
      <!-- 填充颜色工具组件 -->
      <FillTool
        :is-active="currentTool === 'fill'"
        :canvas-width="canvasWidth"
        :canvas-height="canvasHeight"
      />
      
      <!-- 插入文本工具组件 -->
      <TextTool
        :is-active="currentTool === 'text'"
        :canvas-width="canvasWidth"
        :canvas-height="canvasHeight"
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
import Reshape from './components/reshape.vue'
import EraserTool from './components/eraser_tool.vue'
import RectangleTool from './components/rectangle_tool.vue'
import CircleTool from './components/circle_tool.vue'
import FillTool from './components/fill_tool.vue'
import TextTool from './components/text_tool.vue'
import AiGenerate from './components/aigc/generator.vue'

// 工具类型
type ToolType = 'line' | 'brush' | 'reshape' | 'eraser' | 'rectangle' | 'circle' | 'fill' | 'text'


// 响应式变量
const canvasRef = ref<HTMLCanvasElement | null>(null)
const canvasWidth = ref<number>(800)
const canvasHeight = ref<number>(600)

// 工具状态
const currentTool = ref<ToolType | null>(null)
const drawLineRef = ref<InstanceType<typeof DrawLine> | null>(null)
const drawBrushRef = ref<InstanceType<typeof DrawBrush> | null>(null)
const reshapeRef = ref<InstanceType<typeof Reshape> | null>(null)
// 状态管理
const allPaths = ref<paper.Path[]>([])

// 存储背景图片的引用
const backgroundImage = ref<paper.Raster | null>(null)
// 背景矩形（用于导出时隐藏）
const backgroundRect = ref<paper.Path | null>(null)
// 标记：当前是否由 props.imgSrc 触发的导入过程（用于避免导入→导出→再次导入循环）
const isImportingFromProps = ref<boolean>(false)
// 标记：是否是第一次挂载（用于控制只在第一次挂载时导入图片）
const isFirstMount = ref<boolean>(true)
// 保存当前选中的路径，用于导入后恢复控制点显示
const selectedPathForRestore = ref<paper.Path | null>(null)

// AI生成弹窗状态
const aiDialogVisible = ref<boolean>(false)

const props = defineProps<{
  imgSrc: string | null
  imgLoading: boolean
}>()

const emit = defineEmits<{
  (e: 'svg-change', svg: string): void
}>()


// 加载位图图片到画布（PNG/JPG/...）
const loadImageToCanvas = (imageSrc: string): void => {
  if (!paper.project) return
  
  // 如果已有背景图片，先移除
  if (backgroundImage.value) {
    backgroundImage.value.remove()
  }
  
  // 创建新的光栅图像
  const raster = new paper.Raster(imageSrc)
  
  raster.onLoad = () => {
    raster.position = paper.view.center
    

    
    // 将图片放到最底层，作为背景
    raster.sendToBack()
    
    backgroundImage.value = raster
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

// 根据 url 自动判断并导入到画布（优先解析为 SVG，其次作为位图 Raster）
const loadFileToCanvas = async (imageSrc: string): Promise<void> => {
  if (!paper.project) return
  try {
    const resp = await fetch(imageSrc)
    // 先尝试从响应体的 blob.type 判断（对 blob: URL 更可靠）
    let isSvg = false
    let svgText: string | null = null
    try {
      const blob = await resp.clone().blob()
      if (blob && typeof blob.type === 'string' && blob.type.includes('image/svg')) {
        isSvg = true
        svgText = await blob.text()
      }
    } catch {}

    // 退化到 header 判断
    if (!isSvg) {
      const contentType = resp.headers.get('content-type') || ''
      if (contentType.includes('image/svg')) {
        isSvg = true
        svgText = await resp.clone().text()
      }
    }

    // 最后尝试直接将文本解析为 SVG（针对部分 blob: 无类型场景）
    if (!isSvg) {
      try {
        const text = await resp.clone().text()
        if (/^\s*<svg[\s\S]*<\/svg>\s*$/i.test(text)) {
          isSvg = true
          svgText = text
        }
      } catch {}
    }

    if (isSvg && svgText != null) {
      importSvgToCanvas(svgText)
    } else {
      loadImageToCanvas(imageSrc)
    }
  } catch {
    // 回退策略：按位图处理
    loadImageToCanvas(imageSrc)
  }
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
  backgroundRect.value = background
  
  // 初始图片加载交由下面的 watch 处理
  
  paper.view.update()
}

// 选择工具
const selectTool = (tool: ToolType): void => {
  currentTool.value = tool
  

  if (drawLineRef.value) {
    drawLineRef.value.resetDrawing()
  }
  

  if (drawBrushRef.value) {
    drawBrushRef.value.resetDrawing()
  }
  
  // 切换工具时总是隐藏控制点
  if (reshapeRef.value) {
    reshapeRef.value.hideControlPoints()
  }
}

// 处理直线创建
//todo:逻辑迁移到draw_line组件内部
const handleLineCreated = (line: paper.Path): void => {
  allPaths.value.push(line)
  paper.view.update()
  exportSvgAndEmit()
}


//painter提供allPath接口给直线组件
const getAllPathsValue = (): paper.Path[] => {
  return allPaths.value
}
const setAllPathsValue = (paths: paper.Path[]): void => {
  allPaths.value = paths
}
export { getAllPathsValue, setAllPathsValue }


// 处理笔刷路径创建
const handlePathCreated = (path: paper.Path): void => {
  allPaths.value.push(path)
  paper.view.update()
  exportSvgAndEmit()
}

// 处理路径更新（由reshape组件触发）
const handlePathsUpdate = (paths: paper.Path[]): void => {
  allPaths.value = paths
}


// 鼠标按下事件
const handleMouseDown = (event: MouseEvent): void => {
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
  
  // 处理变形工具
  if (currentTool.value === 'reshape' && reshapeRef.value) {
    reshapeRef.value.handleMouseDown(point)
    return
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
    // 委托给 Reshape 组件处理
    if (reshapeRef.value) {
      reshapeRef.value.handleClick(point)
    }
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
  
  // 委托给 Reshape 组件处理拖拽
  if (currentTool.value === 'reshape' && reshapeRef.value) {
    reshapeRef.value.handleMouseMove(point)
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

// 全局鼠标释放事件（用于reshape工具）
const handleMouseUp = (): void => {
  if (currentTool.value === 'reshape' && reshapeRef.value) {
    reshapeRef.value.handleMouseUp()
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
  if(data.model === 'claude' || data.model === 'recraft'){
    data.model = 'svg'
  }else{
    data.model = 'png'
  }

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
  
  const raster = new paper.Raster(imageUrl)
  
  raster.onLoad = () => {
    raster.position = paper.view.center
    
    // 保持原始尺寸，不进行自动缩放
    // 如果需要缩放，用户可以手动调整
    
    // 添加点击事件处理
    // raster.onMouseDown = (event: paper.MouseEvent) => {
    //   if (currentTool.value === 'reshape') {
    //     selectPathExclusive(null) // 清除路径选择
    //     raster.selected = true
    //     paper.view.update()
    //   }
    // }

    paper.view.update()
    // console.log('PNG图片已导入到画布')

    exportSvgAndEmit()
  }
  
  raster.onError = () => {
    console.error('failed to load image')
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
      console.error('invalid svg content')
      return
    }
    
    // 使用Paper.js导入SVG
    const importedItem = paper.project.importSVG(svgElement as unknown as SVGElement)
    
    if (importedItem) {
      importedItem.position = paper.view.center
      
      
      // 收集所有可编辑的路径
      const collectPaths = (item: paper.Item): void => {
        if (item instanceof paper.Path && item.segments && item.segments.length > 0) {
          // 添加到可编辑路径列表
          allPaths.value.push(item)
          
          // 添加鼠标事件处理
          item.onMouseDown = () => {
            if (currentTool.value === 'reshape' && reshapeRef.value) {
              reshapeRef.value.showControlPoints(item)
              paper.view.update()
            }
          }
        } else if (item instanceof paper.Group || item instanceof paper.CompoundPath) {
          // 递归处理子项
          if (item.children) {
            item.children.forEach(child => collectPaths(child))
          }
        }
      }
      
      // 收集导入的所有路径
      collectPaths(importedItem)
      
      // 更新视图
      paper.view.update()
      // console.log(`SVG已导入到画布，共${allPaths.value.length - (allPaths.value.length - countNewPaths(importedItem))}条可编辑路径`)
      // 导入来源于 props 时不导出，避免循环
      if (!isImportingFromProps.value) exportSvgAndEmit()
      else isImportingFromProps.value = false
    }
  } catch (error) {
    console.error('failed to import svg:', error)
  }
}

// 清空画布
const clearCanvas = (): void => {
  if (reshapeRef.value) {
    reshapeRef.value.hideControlPoints()
  }
  allPaths.value.forEach((path: paper.Path) => {
    if (path && path.parent) {
      path.remove()
    }
  })
  allPaths.value = []
  
  // 清理选中路径状态
  selectedPathForRestore.value = null
  
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
  backgroundRect.value = background
  
  paper.view.update()

  // 导出变更
  exportSvgAndEmit()
}

// 监听props中的imgSrc变化
watch(
  () => props.imgSrc,
  async (newImgSrc) => {
    if (!newImgSrc) return
    
    // 只在第一次挂载时导入图片
    if (!isFirstMount.value) {
      return
    }
    
    isImportingFromProps.value = true
    
    // 每次外部传入图片时，清空当前项目并重新导入，避免叠加
    if (paper.project) {
      paper.project.clear()
      const background = new paper.Path.Rectangle({
        point: [0, 0],
        size: [canvasWidth.value, canvasHeight.value],
        fillColor: 'transparent'
      })
      backgroundRect.value = background
      allPaths.value = []
      backgroundImage.value = null
      paper.view.update()
    }
    
    // 加载新内容
    await loadFileToCanvas(newImgSrc)
    
    // 导入完成后清理状态，不自动恢复控制点显示
    // 让用户主动点击路径来显示控制点，避免干扰绘制体验
    setTimeout(() => {
      selectedPathForRestore.value = null
      isImportingFromProps.value = false
      isFirstMount.value = false // 标记第一次挂载已完成
    }, 200)
  },
  { immediate: true }
)

onMounted(() => {
  initPaper()
  
  // 添加键盘事件监听
  const handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      if (reshapeRef.value) {
        reshapeRef.value.hideControlPoints()
      }
      if (drawLineRef.value) {
        drawLineRef.value.resetDrawing()
      }
      if (drawBrushRef.value) {
        drawBrushRef.value.resetDrawing()
      }
      paper.view.update()
    } else {
      // 委托给reshape组件处理其他键盘事件
      if (reshapeRef.value) {
        reshapeRef.value.handleKeyDown(event)
      }
    }
  }
  
  // 添加键盘和鼠标事件监听
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('mouseup', handleMouseUp)
  
  // 清理函数
  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
    window.removeEventListener('mouseup', handleMouseUp)
  })
})

// 导出当前画布为 SVG 并上报父组件
const exportSvgAndEmit = (): void => {
  // console.log('exportSvgAndEmit 被调用')
  if (!paper.project) {
    // paper.project does not exist
    return
  }
  
  // 在导出SVG之前隐藏所有控制点，避免控制点被包含在SVG中
  if (reshapeRef.value) {
    reshapeRef.value.hideControlPoints()
  }
  
  const prevVisible = backgroundRect.value?.visible ?? true
  if (backgroundRect.value) backgroundRect.value.visible = false
  try {
    // 导出SVG时保持原始尺寸和viewBox
    const svgStr = (paper.project as any).exportSVG({ 
      asString: true, 
      embedImages: true,
      bounds: paper.view.bounds // 使用视图边界确保尺寸正确
    }) as string
    // console.log('exported svg length:', svgStr?.length)
    if (typeof svgStr === 'string') {
      // console.log('send svg-change event')
      emit('svg-change', svgStr)
    }
  } catch (e) {
    console.error('failed to export svg:', e)
  } finally {
    if (backgroundRect.value) backgroundRect.value.visible = prevVisible
  }
}
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

.tool-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
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
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 6px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background-color: #fff;
  color: #666;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;
  text-align: center;
  min-height: 48px;
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

.tool-btn:focus {
  outline: none;
  box-shadow: none;
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
  font-size: 11px;
  line-height: 1.2;
  white-space: nowrap;
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
