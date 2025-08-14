<template>
  <div class="area-selector-container">
    <div class="screenshot-wrapper" ref="screenshotWrapper" @click.stop>
      <img
        :src="screenshotDataUrl"
        class="screenshot-image"
        @mousedown="startSelection"
        @click.stop
        ref="screenshotImage"
      />

      <!-- 选择框 -->
      <div
        v-if="isSelecting || selectedArea"
        class="selection-box"
        :style="selectionBoxStyle"
        @mousedown="startDrag"
        @click.stop
      >
        <!-- 四个角的拖拽点 -->
        <div class="resize-handle top-left" @mousedown="startResize($event, 'top-left')"></div>
        <div class="resize-handle top-right" @mousedown="startResize($event, 'top-right')"></div>
        <div class="resize-handle bottom-left" @mousedown="startResize($event, 'bottom-left')"></div>
        <div class="resize-handle bottom-right" @mousedown="startResize($event, 'bottom-right')"></div>

        <!-- 选中区域信息显示 -->
        <div class="selection-info">
          {{ Math.round(selectedArea?.width || 0) }} × {{ Math.round(selectedArea?.height || 0) }}
        </div>
      </div>

      <!-- 遮罩层（选中区域外的暗化效果） -->
      <div v-if="selectedArea" class="mask-overlay">
        <!-- 上方遮罩 -->
        <div
          class="mask-part"
          :style="{
            top: 0,
            left: 0,
            right: 0,
            height: selectedArea.y + 'px'
          }"
        ></div>
        <!-- 下方遮罩 -->
        <div
          class="mask-part"
          :style="{
            top: selectedArea.y + selectedArea.height + 'px',
            left: 0,
            right: 0,
            bottom: 0
          }"
        ></div>
        <!-- 左侧遮罩 -->
        <div
          class="mask-part"
          :style="{
            top: selectedArea.y + 'px',
            left: 0,
            width: selectedArea.x + 'px',
            height: selectedArea.height + 'px'
          }"
        ></div>
        <!-- 右侧遮罩 -->
        <div
          class="mask-part"
          :style="{
            top: selectedArea.y + 'px',
            left: selectedArea.x + selectedArea.width + 'px',
            right: 0,
            height: selectedArea.height + 'px'
          }"
        ></div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="controls" @click.stop>
      <UIButton @click="resetSelection" variant="secondary">
        {{ $t({ en: 'Reset', zh: '重新选择' }) }}
      </UIButton>
      <UIButton @click="confirmSelection" :disabled="!selectedArea" variant="primary">
        {{ $t({ en: 'Confirm', zh: '确认选择' }) }}
      </UIButton>
      <UIButton @click="cancel" variant="secondary">
        {{ $t({ en: 'Cancel', zh: '取消' }) }}
      </UIButton>
    </div>

    <!-- 使用提示 -->
    <div class="tips" @click.stop>
      <p>{{ $t({ en: 'Drag to select recording area', zh: '拖拽选择录屏区域' }) }}</p>
      <p>{{ $t({ en: 'Drag corners to resize', zh: '拖拽四角调整大小' }) }}</p>
    </div>
  </div>
</template>
  
  <script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import UIButton from '@/components/ui/UIButton.vue'
import { useI18n } from '@/utils/i18n'

interface SelectedArea {
  x: number
  y: number
  width: number
  height: number
}

const props = defineProps<{
  screenshotDataUrl: string
  screenshotWidth: number
  screenshotHeight: number
}>()

const emit = defineEmits<{
  areaSelected: [area: SelectedArea]
  cancelled: []
}>()

const { t } = useI18n()

// 选择状态
const isSelecting = ref(false)
const isDragging = ref(false)
const selectedArea = ref<SelectedArea | null>(null)
const screenshotWrapper = ref<HTMLElement | null>(null)
const screenshotImage = ref<HTMLImageElement | null>(null)

// 选择框样式
const selectionBoxStyle = computed(() => {
  if (!selectedArea.value) return {}

  const { x, y, width, height } = selectedArea.value
  return {
    left: `${x}px`,
    top: `${y}px`,
    width: `${width}px`,
    height: `${height}px`
  }
})

// 获取相对坐标
const getRelativeCoordinates = (event: MouseEvent) => {
  if (!screenshotImage.value) return { x: 0, y: 0 }

  const rect = screenshotImage.value.getBoundingClientRect()
  return {
    x: Math.max(0, Math.min(event.clientX - rect.left, rect.width)),
    y: Math.max(0, Math.min(event.clientY - rect.top, rect.height))
  }
}

// 开始选择区域
const startSelection = (event: MouseEvent) => {
  if (event.target !== screenshotImage.value) return

  const { x: startX, y: startY } = getRelativeCoordinates(event)

  isSelecting.value = true
  selectedArea.value = {
    x: startX,
    y: startY,
    width: 0,
    height: 0
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isSelecting.value || !selectedArea.value) return

    const { x: currentX, y: currentY } = getRelativeCoordinates(e)

    selectedArea.value = {
      x: Math.min(startX, currentX),
      y: Math.min(startY, currentY),
      width: Math.abs(currentX - startX),
      height: Math.abs(currentY - startY)
    }
  }

  const handleMouseUp = () => {
    isSelecting.value = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)

    // 如果选择区域太小，则清除
    if (selectedArea.value && (selectedArea.value.width < 10 || selectedArea.value.height < 10)) {
      selectedArea.value = null
    }
  }

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

// 开始拖拽选择框
const startDrag = (event: MouseEvent) => {
  if (!selectedArea.value) return

  event.preventDefault()
  event.stopPropagation()

  const { x: startX, y: startY } = getRelativeCoordinates(event)
  const originalArea = { ...selectedArea.value }
  const offsetX = startX - originalArea.x
  const offsetY = startY - originalArea.y

  isDragging.value = true

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.value || !screenshotImage.value) return

    const { x: currentX, y: currentY } = getRelativeCoordinates(e)
    const rect = screenshotImage.value.getBoundingClientRect()

    let newX = currentX - offsetX
    let newY = currentY - offsetY

    // 限制边界
    newX = Math.max(0, Math.min(newX, rect.width - originalArea.width))
    newY = Math.max(0, Math.min(newY, rect.height - originalArea.height))

    selectedArea.value = {
      x: newX,
      y: newY,
      width: originalArea.width,
      height: originalArea.height
    }
  }

  const handleMouseUp = () => {
    isDragging.value = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

// 调整选择框大小
const startResize = (event: MouseEvent, handle: string) => {
  event.stopPropagation()
  event.preventDefault()

  if (!selectedArea.value || !screenshotImage.value) return

  const { x: startX, y: startY } = getRelativeCoordinates(event)
  const originalArea = { ...selectedArea.value }
  const rect = screenshotImage.value.getBoundingClientRect()

  const handleMouseMove = (e: MouseEvent) => {
    const { x: currentX, y: currentY } = getRelativeCoordinates(e)
    const deltaX = currentX - startX
    const deltaY = currentY - startY

    let newArea = { ...originalArea }

    switch (handle) {
      case 'top-left':
        newArea.x = Math.max(0, originalArea.x + deltaX)
        newArea.y = Math.max(0, originalArea.y + deltaY)
        newArea.width = originalArea.width - (newArea.x - originalArea.x)
        newArea.height = originalArea.height - (newArea.y - originalArea.y)
        break
      case 'top-right':
        newArea.y = Math.max(0, originalArea.y + deltaY)
        newArea.width = Math.min(rect.width - originalArea.x, originalArea.width + deltaX)
        newArea.height = originalArea.height - (newArea.y - originalArea.y)
        break
      case 'bottom-left':
        newArea.x = Math.max(0, originalArea.x + deltaX)
        newArea.width = originalArea.width - (newArea.x - originalArea.x)
        newArea.height = Math.min(rect.height - originalArea.y, originalArea.height + deltaY)
        break
      case 'bottom-right':
        newArea.width = Math.min(rect.width - originalArea.x, originalArea.width + deltaX)
        newArea.height = Math.min(rect.height - originalArea.y, originalArea.height + deltaY)
        break
    }

    // 确保最小尺寸
    newArea.width = Math.max(10, newArea.width)
    newArea.height = Math.max(10, newArea.height)

    selectedArea.value = newArea
  }

  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

// 确认选择
const confirmSelection = () => {
  if (!selectedArea.value || !screenshotImage.value) return

  // 计算相对于原始截图的坐标比例
  const imageElement = screenshotImage.value
  const scaleX = props.screenshotWidth / imageElement.clientWidth
  const scaleY = props.screenshotHeight / imageElement.clientHeight

  const actualArea = {
    x: Math.round(selectedArea.value.x * scaleX),
    y: Math.round(selectedArea.value.y * scaleY),
    width: Math.round(selectedArea.value.width * scaleX),
    height: Math.round(selectedArea.value.height * scaleY)
  }

  emit('areaSelected', actualArea)
}

// 重置选择
const resetSelection = () => {
  selectedArea.value = null
  isSelecting.value = false
  isDragging.value = false
}

// 取消
const cancel = () => {
  emit('cancelled')
}

// 键盘快捷键
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    cancel()
  } else if (event.key === 'Enter' && selectedArea.value) {
    confirmSelection()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>
  
  <style scoped>
.area-selector-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  z-index: 10000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(2px);
}

.screenshot-wrapper {
  position: relative;
  max-width: 90vw;
  max-height: 70vh;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.screenshot-image {
  max-width: 100%;
  max-height: 100%;
  cursor: crosshair;
  display: block;
  user-select: none;
}

.selection-box {
  position: absolute;
  border: 2px solid #007acc;
  background: rgba(0, 122, 204, 0.1);
  cursor: move;
  user-select: none;
}

.selection-box:hover {
  border-color: #0099ff;
}

.resize-handle {
  position: absolute;
  width: 8px;
  height: 8px;
  background: #007acc;
  border: 1px solid white;
  border-radius: 1px;
}

.resize-handle:hover {
  background: #0099ff;
  transform: scale(1.2);
}

.resize-handle.top-left {
  top: -4px;
  left: -4px;
  cursor: nw-resize;
}

.resize-handle.top-right {
  top: -4px;
  right: -4px;
  cursor: ne-resize;
}

.resize-handle.bottom-left {
  bottom: -4px;
  left: -4px;
  cursor: sw-resize;
}

.resize-handle.bottom-right {
  bottom: -4px;
  right: -4px;
  cursor: se-resize;
}

.selection-info {
  position: absolute;
  top: -30px;
  left: 0;
  background: rgba(0, 122, 204, 0.9);
  color: white;
  padding: 4px 8px;
  font-size: 12px;
  border-radius: 4px;
  font-family: monospace;
  white-space: nowrap;
}

.mask-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.mask-part {
  position: absolute;
  background: rgba(0, 0, 0, 0.4);
}

.controls {
  margin-top: 20px;
  display: flex;
  gap: 12px;
  z-index: 1;
}

.tips {
  margin-top: 16px;
  color: white;
  text-align: center;
  font-size: 14px;
  opacity: 0.8;
}

.tips p {
  margin: 4px 0;
}
</style>