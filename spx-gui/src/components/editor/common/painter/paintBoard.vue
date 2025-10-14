<template>
  <div class="painter-container">
    <!-- 顶部工具栏 -->
    <div class="toolbar-top">
      <div class="tool-section">
        <!-- 当前颜色显示（选择颜色） -->
        <SelectColor ref="selectColorRef" :is-active="currentTool === 'selectColor'" />
        <button
          class="tool-btn ai-btn"
          :title="$t({ en: 'AI Generate Image', zh: 'AI生成图片' })"
          @click="showAiDialog"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 12l2 2 4-4"></path>
            <path d="M21 12c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1z"></path>
            <path d="M3 12c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1z"></path>
            <path d="M12 21c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1z"></path>
            <path d="M12 3c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1z"></path>
            <path
              d="M18.364 18.364c.39.39 1.024.39 1.414 0s.39-1.024 0-1.414-.024-.39-1.414 0-.39 1.024 0 1.414z"
            ></path>
            <path
              d="M4.222 4.222c.39.39 1.024.39 1.414 0s.39-1.024 0-1.414-1.024-.39-1.414 0-.39 1.024 0 1.414z"
            ></path>
            <path
              d="M18.364 5.636c.39-.39.39-1.024 0-1.414s-1.024-.39-1.414 0-.39 1.024 0 1.414 1.024.39 1.414 0z"
            ></path>
            <path
              d="M4.222 19.778c.39-.39.39-1.024 0-1.414s-1.024-.39-1.414 0-.39 1.024 0 1.414 1.024.39 1.414 0z"
            ></path>
          </svg>
          <span>{{ $t({ en: 'AI Generate', zh: 'AI生成' }) }}</span>
        </button>
        <button
          class="tool-btn ai-btn"
          :title="$t({ en: 'AI Beautify Image', zh: 'AI美化图片' })"
          @click="showAiBeautifyModal"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path
              d="M14.2647 15.9377L12.5473 14.2346C11.758 13.4519 11.3633 13.0605 10.9089 12.9137C10.5092 12.7845 10.079 12.7845 9.67922 12.9137C9.22485 13.0605 8.83017 13.4519 8.04082 14.2346L4.04193 18.2622M14.2647 15.9377L14.606 15.5991C15.412 14.7999 15.8149 14.4003 16.2773 14.2545C16.6839 14.1262 17.1208 14.1312 17.5244 14.2688C17.9832 14.4253 18.3769 14.834 19.1642 15.6515L20 16.5001M14.2647 15.9377L18.22 19.9628M11 4H7.2C6.07989 4 5.51984 4 5.09202 4.21799C4.7157 4.40973 4.40973 4.71569 4.21799 5.09202C4 5.51984 4 6.0799 4 7.2V16.8C4 17.4466 4 17.9066 4.04193 18.2622M4.04193 18.2622C4.07264 18.5226 4.12583 18.7271 4.21799 18.908C4.40973 19.2843 4.7157 19.5903 5.09202 19.782C5.51984 20 6.07989 20 7.2 20H16.8C17.9201 20 18.4802 20 18.908 19.782C19.2843 19.5903 19.5903 19.2843 19.782 18.908C20 18.4802 20 17.9201 20 16.8V13M15 5.28571L16.8 7L21 3"
              stroke="#000000"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span>{{ $t({ en: 'AI Beautify', zh: 'AI美化' }) }}</span>
        </button>
      </div>

      <div class="tool-section">
        <button class="tool-btn action-btn" :title="$t({ en: 'Clear Canvas', zh: '清空画布' })" @click="clearCanvas">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3,6 5,6 21,6"></polyline>
            <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
          </svg>
          <span>{{ $t({ en: 'Clear', zh: '清空' }) }}</span>
        </button>
        <button class="tool-btn action-btn" :disabled="!canUndo" :title="$t({ en: 'Undo', zh: '撤销' })" @click="undo">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 7l3-3 9 9 4-4 2 2-6 6-4-4"></path>
          </svg>
          <span>{{ $t({ en: 'Undo', zh: '撤销' }) }}</span>
        </button>
        <button class="tool-btn action-btn" :disabled="!canRedo" :title="$t({ en: 'Redo', zh: '重做' })" @click="redo">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 7v6h-6"></path>
            <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"></path>
          </svg>
          <span>{{ $t({ en: 'Redo', zh: '重做' }) }}</span>
        </button>
      </div>
    </div>

    <!-- 右侧区域（工具栏+画板） -->
    <div class="right-panel">
      <!-- 左侧工具栏 -->
      <div class="toolbar">
        <div class="tool-section">
          <h3 class="tool-title">{{ $t({ en: 'Drawing Tools', zh: '绘图工具' }) }}</h3>
          <div class="tool-grid">
            <button
              :class="['tool-btn', { active: currentTool === 'line' }]"
              :title="$t({ en: 'Line Tool', zh: '直线工具' })"
              @click="selectTool('line')"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="7" y1="17" x2="17" y2="7"></line>
              </svg>
            </button>

            <button
              :class="['tool-btn', { active: currentTool === 'brush' }]"
              :title="$t({ en: 'Brush Tool', zh: '笔刷工具' })"
              @click="selectTool('brush')"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"></path>
                <path
                  d="m7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08-2 2.51-2 2.68-2.02 0.44 0 3.34-1.66 3.34-3.02z"
                ></path>
              </svg>
            </button>

            <button
              :class="['tool-btn', { active: currentTool === 'reshape' }]"
              :title="$t({ en: 'Reshape Tool', zh: '变形工具' })"
              @click="selectTool('reshape')"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"></path>
                <path d="m13 13 6 6"></path>
              </svg>
            </button>

            <button
              :class="['tool-btn', { active: currentTool === 'eraser' }]"
              :title="$t({ en: 'Eraser Tool', zh: '橡皮工具' })"
              @click="selectTool('eraser')"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"></path>
                <path d="M22 21H7"></path>
                <path d="m5 11 9 9"></path>
              </svg>
            </button>

            <button
              :class="['tool-btn', { active: currentTool === 'rectangle' }]"
              :title="$t({ en: 'Rectangle Tool', zh: '矩形工具' })"
              @click="selectTool('rectangle')"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect width="18" height="12" x="3" y="6" rx="2"></rect>
              </svg>
            </button>

            <button
              :class="['tool-btn', { active: currentTool === 'circle' }]"
              :title="$t({ en: 'Circle Tool', zh: '圆形工具' })"
              @click="selectTool('circle')"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="9"></circle>
              </svg>
            </button>

            <button
              :class="['tool-btn', { active: currentTool === 'fill' }]"
              :title="$t({ en: 'Fill Tool', zh: '填充颜色工具' })"
              @click="selectTool('fill')"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 12l2 2 4-4"></path>
                <path d="M21 12c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1z"></path>
                <path d="M3 12c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1z"></path>
                <path d="M12 21c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1z"></path>
                <path d="M12 3c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1z"></path>
              </svg>
            </button>

            <button
              :class="['tool-btn', { active: currentTool === 'text' }]"
              :title="$t({ en: 'Text Tool', zh: '插入文本工具' })"
              @click="selectTool('text')"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 7V4h16v3"></path>
                <path d="M9 20h6"></path>
                <path d="M12 4v16"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- 画布区域 -->
      <div class="canvas-wrapper">
        <canvas
          ref="canvasRef"
          resize
          style="width: 100%; height: 100%"
          @click="handleCanvasClick"
          @mousedown="handleMouseDown"
          @mousemove="handleMouseMove"
          @mouseup="handleCanvasMouseUp"
          @mouseenter="handleCanvasMouseEnter"
          @mouseleave="handleCanvasMouseLeave"
        ></canvas>

        <!-- 直线绘制组件 -->
        <DrawLine
          ref="drawLineRef"
          :canvas-width="canvasWidth"
          :canvas-height="canvasHeight"
          :is-active="currentTool === 'line'"
        />

        <!-- 笔刷绘制组件 -->
        <DrawBrush
          ref="drawBrushRef"
          :canvas-width="canvasWidth"
          :canvas-height="canvasHeight"
          :is-active="currentTool === 'brush'"
        />

        <!-- 变形工具组件 -->
        <Reshape ref="reshapeRef" :is-active="currentTool === 'reshape'" :all-paths="allPaths" />

        <!-- 橡皮工具组件 -->
        <EraserTool
          ref="eraserToolRef"
          :is-active="currentTool === 'eraser'"
          :canvas-width="canvasWidth"
          :canvas-height="canvasHeight"
        />

        <!-- 矩形工具组件 -->
        <RectangleTool
          ref="rectangleToolRef"
          :is-active="currentTool === 'rectangle'"
          :canvas-width="canvasWidth"
          :canvas-height="canvasHeight"
        />

        <!-- 圆形工具组件 -->
        <CircleTool
          ref="circleToolRef"
          :is-active="currentTool === 'circle'"
          :canvas-width="canvasWidth"
          :canvas-height="canvasHeight"
        />

        <!-- 填充颜色工具组件 -->
        <FillTool
          ref="fillToolRef"
          :is-active="currentTool === 'fill'"
          :canvas-width="canvasWidth"
          :canvas-height="canvasHeight"
        />

        <!-- 插入文本工具组件 -->
        <TextTool
          ref="textToolRef"
          :is-active="currentTool === 'text'"
          :canvas-width="canvasWidth"
          :canvas-height="canvasHeight"
        />
      </div>
    </div>

    <!-- AI生成弹窗 -->
    <AiGenerate v-model:visible="aiDialogVisible" @confirm="handleAiConfirm" @cancel="handleAiCancel" />
    <!-- AI美化弹窗 -->
    <AiBeautifyModal
      v-model:visible="aiBeautifyModalVisible"
      :img-src="imgSrc"
      @confirm="handleAiBeautifyConfirm"
      @cancel="handleAiBeautifyCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, provide, computed } from 'vue'
import paper from 'paper'
import DrawLine from './components/draw_line.vue'
import DrawBrush from './components/draw_brush.vue'
import Reshape from './components/reshape_tool.vue'
import EraserTool from './components/eraser_tool.vue'
import RectangleTool from './components/rectangle_tool.vue'
import CircleTool from './components/circle_tool.vue'
import FillTool from './components/fill_tool.vue'
import TextTool from './components/text_tool.vue'
import AiGenerate from './components/aigc/aigcGenerator.vue'
import { canvasEventDelegator, type ToolHandler } from './utils/delegator'
import { createImportExportManager, type ImportExportManager } from './utils/import-export-manager'
import { clearCanvas as clearCanvasFunction } from './utils/clear-canvas'
import { HistoryManager } from './utils/history-manager'
import SelectColor from './components/select_color.vue'
import AiBeautifyModal from './components/aiBeautify/aiBeautifyModal.vue'

// 工具类型
type ToolType = 'line' | 'brush' | 'reshape' | 'eraser' | 'rectangle' | 'circle' | 'fill' | 'text' | 'selectColor'

// 响应式变量
const canvasRef = ref<HTMLCanvasElement | null>(null)
const canvasWidth = ref<number>(0)
const canvasHeight = ref<number>(0)
import { getCanvasSize } from './utils/canvasSize'
const canvasColor = ref<string>('#1f11ff')

// 工具状态
const currentTool = ref<ToolType | null>(null)
const drawLineRef = ref<InstanceType<typeof DrawLine> | null>(null)
const drawBrushRef = ref<InstanceType<typeof DrawBrush> | null>(null)
const reshapeRef = ref<InstanceType<typeof Reshape> | null>(null)
const eraserToolRef = ref<InstanceType<typeof EraserTool> | null>(null)
const circleToolRef = ref<InstanceType<typeof CircleTool> | null>(null)
const rectangleToolRef = ref<InstanceType<typeof RectangleTool> | null>(null)
const fillToolRef = ref<InstanceType<typeof FillTool> | null>(null)
const selectColorRef = ref<InstanceType<typeof SelectColor> | null>(null)
const textToolRef = ref<InstanceType<typeof TextTool> | null>(null)

// 导入导出管理器
let importExportManager: ImportExportManager | null = null

//事件分发器
const initEventDelegator = (): void => {
  canvasEventDelegator.setToolRefs({
    line: drawLineRef.value as ToolHandler,
    brush: drawBrushRef.value as ToolHandler,
    reshape: reshapeRef.value as ToolHandler,
    eraser: eraserToolRef.value as ToolHandler,
    circle: circleToolRef.value as ToolHandler,
    rectangle: rectangleToolRef.value as ToolHandler,
    fill: fillToolRef.value as ToolHandler,
    text: textToolRef.value as ToolHandler,
    selectColor: selectColorRef.value as ToolHandler
  })

  canvasEventDelegator.setCurrentTool(currentTool.value)
}

// 初始化导入导出管理器
const initImportExportManager = (): void => {
  importExportManager = createImportExportManager({
    canvasWidth,
    canvasHeight,
    canvasRef,
    allPaths,
    currentTool,
    reshapeRef,
    backgroundRect,
    backgroundImage,
    isImportingFromProps,
    emit: (event: string, data: any) => emit(event as any, data)
  })
}

// 选择工具
const selectTool = (tool: ToolType): void => {
  currentTool.value = tool
  // 更新委托器的当前工具
  canvasEventDelegator.setCurrentTool(tool)
}

const handleCanvasClick = (event: MouseEvent): void => {
  canvasEventDelegator.delegateClick(event, canvasRef.value)
}
const handleMouseDown = (event: MouseEvent): void => {
  canvasEventDelegator.delegateMouseDown(event, canvasRef.value)
}

const handleMouseMove = (event: MouseEvent): void => {
  canvasEventDelegator.delegateMouseMove(event, canvasRef.value)
}

const handleCanvasMouseUp = (event: MouseEvent): void => {
  canvasEventDelegator.delegateMouseUp(event, canvasRef.value)
}

const handleCanvasMouseEnter = (event: MouseEvent): void => {
  canvasEventDelegator.delegateMouseEnter(event, canvasRef.value)
}

const handleCanvasMouseLeave = (event: MouseEvent): void => {
  canvasEventDelegator.delegateMouseLeave(event, canvasRef.value)
}

const handleMouseUp = (): void => {
  canvasEventDelegator.delegateGlobalMouseUp()
}

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
// AI美化弹窗状态
const aiBeautifyModalVisible = ref<boolean>(false)
// 记录上一次导入的图片地址，避免重复导入
const lastImportedSrc = ref<string | null>(null)
// 标记：由内部导出导致的外部 imgSrc 变化，跳过一次导入
const skipNextImport = ref<boolean>(false)

const historyManager = ref<HistoryManager | null>(null)

const props = defineProps<{
  imgSrc: string | null
  imgLoading: boolean
}>()

const emit = defineEmits<{
  (e: 'svg-change', svg: string): void
  (e: 'ai-beautify', imgSrc: string): void
}>()

// 根据 url 自动判断并导入到画布（优先解析为 SVG，其次作为位图 Raster）
const loadFileToCanvas = async (imageSrc: string): Promise<void> => {
  if (importExportManager) {
    await importExportManager.importFile(imageSrc)
  }
}

// 初始化 Paper.js
const initPaper = (): void => {
  if (!canvasRef.value) return
  let { width, height } = getCanvasSize(canvasRef.value)
  canvasWidth.value = width
  canvasHeight.value = height

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
/**
 * 递归地从一个项目或图层中获取所有可绘制的矢量路径。
 * @param item - 开始搜索的项目
 * @returns 一个包含所有 Path, CompoundPath 和 Shape 的数组
 */
function getAllDrawablePaths(item: paper.Item): (paper.Path | paper.CompoundPath | paper.Shape)[] {
  let paths: (paper.Path | paper.CompoundPath | paper.Shape)[] = []

  // 检查当前项目是否是我们需要的目标类型
  if (item instanceof paper.Path || item instanceof paper.CompoundPath || item instanceof paper.Shape) {
    // 确保它不是背景或其他特殊用途的路径
    if (!item.data.isBackground) {
      paths.push(item)
    }
  }
  // 如果当前项目是一个容器（例如 Group 或 Layer），则递归遍历其子项
  else if (item.children) {
    for (const child of item.children) {
      paths = paths.concat(getAllDrawablePaths(child))
    }
  }

  return paths
}
//painter提供allPath接口给直线组件
const getAllPathsValue = (): (paper.Path | paper.CompoundPath | paper.Shape)[] => {
  if (paper.project && paper.project.activeLayer) {
    return getAllDrawablePaths(paper.project.activeLayer)
  }
  return []
}
const setAllPathsValue = (paths: paper.Path[]): void => {
  //历史记录保存
  if (!historyManager.value || !importExportManager) return

  //这里保存的是修改后的值
  const svgContent = importExportManager.exportSvg()
  if (svgContent) {
    historyManager.value.addState(svgContent)
  }

  allPaths.value = paths
}

provide('getAllPathsValue', getAllPathsValue)
provide('setAllPathsValue', setAllPathsValue)

// 显示AI生成弹窗
const showAiDialog = (): void => {
  aiDialogVisible.value = true
}

const showAiBeautifyModal = (): void => {
  aiBeautifyModalVisible.value = true
}

// 处理AI生成确认
const handleAiConfirm = async (data: {
  model: string
  prompt: string
  url?: string
  svgContent?: string
}): Promise<void> => {
  if (data.svgContent) {
    await importSvgFromPicgcToCanvas(data.svgContent)
  }

  aiDialogVisible.value = false
}

// 处理AI生成取消
const handleAiCancel = (): void => {
  // console.log('AI生成取消')
  aiDialogVisible.value = false
}

// 处理AI美化确认
const handleAiBeautifyConfirm = async (data: {
  model: string
  prompt: string
  url?: string
  svgContent?: string
}): Promise<void> => {
  if (data.svgContent) {
    await importSvgFromPicgcToCanvas(data.svgContent)
  }

  aiBeautifyModalVisible.value = false
}

// 处理AI美化取消
const handleAiBeautifyCancel = (): void => {
  aiBeautifyModalVisible.value = false
}

// // 处理AI图片搜索确认
// const handleAiImageConfirm = async (image: {
//   id: string
//   title: string
//   thumbnail: string
//   url: string
//   description?: string
// }): Promise<void> => {
//   try {
//     // 加载选中的图片到画布
//     await loadFileToCanvas(image.url)
//   } catch (error) {
//     console.error('加载搜索图片失败:', error)
//   }
// }

// 导入PNG图片到画布
// const importImageToCanvas = async (imageUrl: string): Promise<void> => {
//   if (importExportManager) {
//     await importExportManager.importImage(imageUrl)
//   }
// }

// 导入SVG到画布并转换为可编辑的路径
// const importSvgToCanvas = async (svgContent: string): Promise<void> => {
//   if (importExportManager) {
//     await importExportManager.importSvg(svgContent)
//   }
// }
//aigc导入svg
const importSvgFromPicgcToCanvas = async (svgContent: string): Promise<void> => {
  clearCanvas()
  if (importExportManager) {
    await importExportManager.importSvgFromPicgc(svgContent)
  }
}

// 清空画布
const clearCanvas = (): void => {
  if (!historyManager.value || !importExportManager) return

  clearCanvasFunction({
    canvasWidth,
    canvasHeight,
    allPaths,
    reshapeRef,
    backgroundRect,
    exportSvgAndEmit
  })

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

  // 保存清空后的状态
  const svgContentAfterClear = importExportManager.exportSvg()
  if (svgContentAfterClear) {
    historyManager.value.addState(svgContentAfterClear, 'Clear')
  }
}

//Undo/Redo
const undo = async (): Promise<void> => {
  if (historyManager.value) {
    await historyManager.value.undo()
  }
  exportSvgAndEmit()
}

const redo = async (): Promise<void> => {
  if (historyManager.value) {
    await historyManager.value.redo()
  }
  exportSvgAndEmit()
}

// 添加计算属性用于按钮状态
const canUndo = computed(() => historyManager.value?.canUndo() ?? false)
const canRedo = computed(() => historyManager.value?.canRedo() ?? false)

// 监听props中的imgSrc变化
watch(
  () => props.imgSrc,
  async (newImgSrc) => {
    if (!newImgSrc) return

    // 已经是当前内容则不处理
    if (lastImportedSrc.value === newImgSrc) return
    // 如果是组件内部导出导致的外部更新，跳过一次导入，防止重置画布状态
    if (skipNextImport.value) {
      lastImportedSrc.value = newImgSrc
      skipNextImport.value = false
      isFirstMount.value = false
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
    historyManager.value?.clearHistory()
    historyManager.value?.setInitialState(importExportManager?.exportSvg() || '')
    // 导入完成后清理状态，不自动恢复控制点显示
    // 让用户主动点击路径来显示控制点，避免干扰绘制体验
    setTimeout(() => {
      selectedPathForRestore.value = null
      isImportingFromProps.value = false
      isFirstMount.value = false // 标记第一次挂载已完成
      lastImportedSrc.value = newImgSrc
    }, 200)
  },
  { immediate: true }
)
watch(currentTool, (newTool) => {
  canvasEventDelegator.setCurrentTool(newTool)
})

// 监听工具引用变化，更新委托器
watch(
  [
    drawLineRef,
    drawBrushRef,
    reshapeRef,
    eraserToolRef,
    circleToolRef,
    rectangleToolRef,
    fillToolRef,
    textToolRef,
    selectColorRef
  ],
  () => {
    initEventDelegator()
  },
  { deep: true }
)

onMounted(() => {
  initPaper()

  // 初始化历史管理器
  historyManager.value = new HistoryManager('paintboard_history', 64)

  // 设置画布恢复回调函数
  historyManager.value.setRestoreCallback(async (svgContent: string) => {
    // 清空当前画布
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
    }

    // 导入历史状态
    if (importExportManager) {
      await importExportManager.importSvg(svgContent, {
        clearCanvas: false,
        triggerExport: false,
        updatePaths: false // 禁用自动路径收集，手动处理
      })
    }

    // 手动更新路径数组，确保与画布状态同步
    allPaths.value = getAllPathsValue() as paper.Path[]

    paper.view.update()
  })

  // 添加键盘事件监听
  const handleKeyDown = (event: KeyboardEvent): void => {
    // 处理撤销/重做快捷键
    if (event.ctrlKey || event.metaKey) {
      if (event.key === 'z' && !event.shiftKey) {
        event.preventDefault()
        undo()
      } else if (event.key === 'z' && event.shiftKey) {
        event.preventDefault()
        redo()
      } else if (event.key === 'y') {
        event.preventDefault()
        redo()
      }
    }

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
  initEventDelegator()
  initImportExportManager()
  // 清理函数
  onUnmounted(() => {
    canvasEventDelegator.clearToolRefs()
    window.removeEventListener('keydown', handleKeyDown)
    window.removeEventListener('mouseup', handleMouseUp)
  })
})

// 导出SVG的封装函数
const exportSvgAndEmit = (): void => {
  if (importExportManager) {
    // 标记接下来由父组件更新的 imgSrc 为内部导出触发
    skipNextImport.value = true
    importExportManager.exportSvgAndEmit()
  }
}

provide('currentTool', currentTool)
provide('reshapeRef', reshapeRef)
provide('backgroundRect', backgroundRect)
provide('isImportingFromProps', isImportingFromProps)
provide('exportSvgAndEmit', exportSvgAndEmit)
provide('canvasColor', canvasColor)
</script>

<style scoped>
.painter-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background-color: #f5f5f5;
}

/* 工具栏样式 */
.toolbar {
  width: auto;
  background-color: #ffffff;
  border-right: 1px solid #e0e0e0;
  padding: 16px;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
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
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
}

canvas {
  border-radius: 8px;
  background-color: transparent;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
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

.tool-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tool-btn:disabled:hover {
  background-color: #fff;
  border-color: #e0e0e0;
  color: #666;
}

.right-panel {
  display: flex;
  flex-direction: row;
  flex: 1;
}

.toolbar-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  /* height: 20%; */
  width: 100%;
  background-color: #ffffff;
  border-bottom: 1px solid #e0e0e0;
  padding: 16px;
  z-index: 10;
}

.toolbar-top .tool-section {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16px;
}

.toolbar-top .tool-section .tool-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin: 0;
  padding: 0 8px 0 0;
  border-right: 1px solid #e0e0e0;
  white-space: nowrap;
}

.toolbar-top .tool-section .tool-btn {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background-color: #fff;
  color: #666;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;
  white-space: nowrap;
  min-height: 36px;
}

.toolbar-top .tool-section .tool-btn:hover {
  background-color: #f8f9fa;
  border-color: #2196f3;
  color: #2196f3;
}

.toolbar-top .tool-section .tool-btn svg {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
}

.toolbar-top .tool-section .tool-btn span {
  font-weight: 500;
  font-size: 12px;
  line-height: 1.2;
  white-space: nowrap;
}

.toolbar-top .tool-section .tool-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toolbar-top .tool-section .tool-btn:disabled:hover {
  background-color: #fff;
  border-color: #e0e0e0;
  color: #666;
}
</style>
