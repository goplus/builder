<template>
  <!-- 橡皮擦工具配置面板 -->
  <div v-if="isActive" class="eraser-config">
    <div class="config-item">
      <label>{{ $t({ en: 'Eraser Size', zh: '橡皮大小' }) }}:</label>
      <input v-model.number="eraserSize" type="range" min="5" max="100" step="5" class="size-slider" />
      <span class="size-value">{{ eraserSize }}px</span>
    </div>
  </div>

  <!-- CSS自定义光标 -->
  <div v-if="isActive && showCursor" class="eraser-cursor" :style="cursorStyle"></div>
</template>

<script setup lang="ts">
import { ref, inject, watch, onMounted, onUnmounted, computed } from 'vue'
import paper from 'paper'
import { projectPaperPointToView } from '../utils/coordinate-transform'
import { createStrokeRegionController } from '../utils/strokeRegionController'

const props = defineProps<{
  isActive: boolean
}>()

// 橡皮擦尺寸（可配置）
const eraserSize = ref<number>(20)
// CSS光标相关状态
const showCursor = ref<boolean>(false)
const cursorPosition = ref<{ x: number; y: number }>({ x: 0, y: 0 })
// 画布元素引用
const canvasElement = ref<HTMLElement | null>(null)
const eraserRegionController = createStrokeRegionController({
  minDistance: 2,
  simplifyTolerance: 3
})

// 通过 inject 从父组件 PainterBoard 获取全局路径数组和更新函数
const getAllPathsValue = inject<() => paper.Path[]>('getAllPathsValue')!
const setAllPathsValue = inject<(paths: paper.Path[]) => void>('setAllPathsValue')!
const exportSvgAndEmit = inject<() => void>('exportSvgAndEmit')!

// 计算光标样式
const cursorStyle = computed(() => ({
  width: eraserSize.value + 'px',
  height: eraserSize.value + 'px',
  left: cursorPosition.value.x - eraserSize.value / 2 + 'px',
  top: cursorPosition.value.y - eraserSize.value / 2 + 'px'
}))

//鼠标事件处理函数
const handleMouseDown = (point: paper.Point): void => {
  if (!props.isActive) return

  eraserRegionController.startStroke({
    point,
    strokeWidth: eraserSize.value,
    strokeColor: 'white',
    strokeCap: 'round',
    strokeJoin: 'round'
  })
}

const handleMouseMove = (point: paper.Point): void => {
  if (!props.isActive) return

  // 更新CSS光标位置
  updateCursorPosition(point)

  // 如果正在擦除，向路径中添加点
  if (eraserRegionController.getPath()) {
    eraserRegionController.extendStroke(point)
  }
}
const handleMouseUp = (): void => {
  const activeStroke = eraserRegionController.getPath()

  if (!props.isActive || !activeStroke || activeStroke.segments.length === 0) {
    eraserRegionController.reset(true)
    return
  }

  // 1. 构造最终的 eraserShape
  const { region: eraserShape, strokePath } = eraserRegionController.finalizeRegion({
    radius: eraserSize.value / 2
  })

  if (strokePath) {
    strokePath.remove()
  }

  if (!eraserShape) {
    return
  }
  eraserShape.fillColor = null

  // 2. 获取所有绘制路径
  const allPaths = getAllPathsValue()

  // 3. 遍历路径，处理擦除
  allPaths.forEach((targetPath) => {
    if (!targetPath.project) return

    try {
      if (!eraserShape!.bounds.intersects(targetPath.bounds)) return

      if (targetPath.closed) {
        // --- 策略1：封闭图形 → 布尔运算 ---
        const result = targetPath.subtract(eraserShape!)
        targetPath.remove()

        if (result) {
          if (result instanceof paper.Path || result instanceof paper.CompoundPath) {
            if (result.area < 0.5) result.remove()
          } else {
            result.remove()
          }
        }
      } else {
        // --- 策略2：开放路径 → 路径相交与分割 (使用这段正确逻辑) ---

        // 1. 获取橡皮擦轮廓与目标路径中心线的所有交点
        const intersections = targetPath.getIntersections(eraserShape!)

        if (intersections.length > 0) {
          // 2. 如果有交点，就在这些点上分割路径
          const locations = intersections.sort((a, b) => a.offset - b.offset)

          // 我们需要保留原始样式
          const originalStyle = targetPath.style

          let remainingPath: paper.Path | null = targetPath
          const newPaths: paper.Path[] = []

          // 3. 从后往前分割，以保持前面交点位置的准确性
          for (let i = locations.length - 1; i >= 0; i--) {
            const location = locations[i]
            // splitAt会修改remainingPath并返回新的后半段路径
            const newSegment = remainingPath.splitAt(location)
            if (newSegment) {
              newPaths.push(newSegment)
            }
          }
          newPaths.push(remainingPath) // 将分割后剩下的第一段也加入数组

          // 4. 移除原始路径（因为它已经被彻底分割）
          // 在循环外执行此操作是安全的，因为 targetPath 引用已被 newPaths 数组中的片段取代
          // targetPath.remove(); // splitAt 已经破坏了原路径，直接让它被GC回收即可

          // 5. 检查每个片段，只保留在橡皮擦外部的
          newPaths.forEach((segment) => {
            const midPoint = segment.getPointAt(segment.length / 2)
            if (midPoint && !eraserShape!.contains(midPoint)) {
              // 这段在外面，保留它，并恢复其样式
              segment.style = originalStyle
            } else {
              // 这段在里面，从画布移除
              segment.remove()
            }
          })
        } else {
          // 如果没有交点，但整条线都在橡皮擦内部，则直接删除
          const midPoint = targetPath.getPointAt(targetPath.length / 2)
          if (midPoint && eraserShape!.contains(midPoint)) {
            targetPath.remove()
          }
        }
      }
    } catch (error) {
      console.warn('橡皮擦运算出错，保留原路径:', error)
    }
  })

  // 4. 清理擦除区域
  eraserShape.remove()

  // 5. 强制刷新 + 同步 Vue 状态
  paper.view.update()

  const finalPaths = paper.project.activeLayer.children.filter((child): child is paper.Path | paper.CompoundPath => {
    const isPath = child instanceof paper.Path
    const isCompoundPath = child instanceof paper.CompoundPath
    const isBackground = (child as any).data?.isBackground === true
    const area = (child as any).area || 0
    return (isPath || isCompoundPath) && !isBackground && area > 0.5
  })

  setAllPathsValue(finalPaths as paper.Path[])
  exportSvgAndEmit()
}

// 更新CSS光标位置
const updateCursorPosition = (point: paper.Point): void => {
  if (!canvasElement.value || !paper.view) return

  // 将项目坐标转换为视图坐标（考虑缩放）
  const viewPoint = projectPaperPointToView(point)

  const canvasRect = canvasElement.value.getBoundingClientRect()
  cursorPosition.value = {
    x: viewPoint.x + canvasRect.left,
    y: viewPoint.y + canvasRect.top
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
  if (props.isActive && !eraserRegionController.getPath()) {
    showCursor.value = true
    updateCursorPosition(point)
  }
}

// 处理鼠标离开画布事件
const handleMouseLeave = (): void => {
  showCursor.value = false
  if (eraserRegionController.getPath()) {
    handleMouseUp()
  }
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
        eraserRegionController.reset(true)
      }
    }
  }
)

// 监听橡皮擦尺寸变化（CSS光标会自动响应）
watch(eraserSize, () => {
  // CSS光标大小会通过响应式绑定自动更新，无需额外操作
})

// 组件挂载时获取画布元素
onMounted(() => {
  getCanvasElement()
})

// 清理资源
onUnmounted(() => {
  showCursor.value = false
  eraserRegionController.reset(true)
  canvasElement.value = null
})

defineExpose({
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
  handleMouseLeave,
  handleMouseEnter,
  eraserSize
})
</script>

<style scoped lang="scss">
.eraser-config {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 100;
  min-width: 200px;
}

.config-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #333;
}

.config-item label {
  font-weight: 500;
  white-space: nowrap;
}

.size-slider {
  flex: 1;
  height: 4px;
  background: #e0e0e0;
  border-radius: 2px;
  outline: none;
  appearance: none;

  &::-webkit-slider-thumb {
    appearance: none;
    width: 16px;
    height: 16px;
    background: #2196f3;
    border-radius: 50%;
    cursor: pointer;
  }

  &::-moz-range-thumb {
    width: 16px;
    height: 16px;
    background: #2196f3;
    border-radius: 50%;
    border: none;
    cursor: pointer;
  }
}

.size-value {
  font-weight: 600;
  color: #2196f3;
  min-width: 40px;
  text-align: right;
}

.eraser-cursor {
  position: fixed;
  border: 2px solid #ff4444;
  border-radius: 50%;
  background: rgba(255, 68, 68, 0.15); // 稍微增加透明度，与系统光标更好配合
  pointer-events: none;
  z-index: 9999;
  transition: none; // 禁用过渡动画以提高性能
}
</style>
