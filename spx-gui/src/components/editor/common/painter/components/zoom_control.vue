<template>
  <div class="zoom-control">
    <button class="zoom-btn" :title="$t({ en: 'Zoom Out', zh: '缩小' })" @click="zoomOut">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"></circle>
        <path d="M21 21l-4.35-4.35"></path>
        <line x1="8" y1="11" x2="14" y2="11"></line>
      </svg>
    </button>

    <button class="zoom-level" :title="$t({ en: 'Reset Zoom', zh: '重置缩放' })" @click="resetZoom">
      {{ zoomPercentage }}%
    </button>

    <button class="zoom-btn" :title="$t({ en: 'Zoom In', zh: '放大' })" @click="zoomIn">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"></circle>
        <path d="M21 21l-4.35-4.35"></path>
        <line x1="11" y1="8" x2="11" y2="14"></line>
        <line x1="8" y1="11" x2="14" y2="11"></line>
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import paper from 'paper'

// 缩放相关的状态
const zoomLevel = ref<number>(1)
const zoomPercentage = ref<number>(100)

// 缩放配置
const ZOOM_STEP = 0.1 // 每次缩放 10%
const MIN_ZOOM = 0.1 // 最小缩放到 10%
const MAX_ZOOM = 5 // 最大放大到 500%

/**
 * 更新缩放级别
 */
const updateZoom = (newZoom: number): void => {
  // 限制缩放范围
  const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom))

  if (!paper.view) return

  // 以画布中心为基准进行缩放
  const center = paper.view.center
  paper.view.zoom = clampedZoom
  paper.view.center = center

  zoomLevel.value = clampedZoom
  zoomPercentage.value = Math.round(clampedZoom * 100)
}

/**
 * 放大
 */
const zoomIn = (): void => {
  updateZoom(zoomLevel.value + ZOOM_STEP)
}

/**
 * 缩小
 */
const zoomOut = (): void => {
  updateZoom(zoomLevel.value - ZOOM_STEP)
}

/**
 * 重置缩放到 100%
 */
const resetZoom = (): void => {
  updateZoom(1)
}

/**
 * 处理鼠标滚轮缩放
 */
const handleWheel = (event: WheelEvent): void => {
  // 只在按住 Ctrl 或 Cmd 键时才缩放
  if (event.ctrlKey || event.metaKey) {
    event.preventDefault()

    const delta = event.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
    updateZoom(zoomLevel.value + delta)
  }
}

onMounted(() => {
  // 添加滚轮缩放支持
  window.addEventListener('wheel', handleWheel, { passive: false })
})

onUnmounted(() => {
  window.removeEventListener('wheel', handleWheel)
})

// 暴露方法给父组件
defineExpose({
  zoomIn,
  zoomOut,
  resetZoom,
  updateZoom
})
</script>

<style scoped>
.zoom-control {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  background-color: #f8f9fa;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
}

.zoom-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 6px;
  border: none;
  border-radius: 4px;
  background-color: transparent;
  color: #666;
  cursor: pointer;
  transition: all 0.2s ease;
}

.zoom-btn:hover {
  background-color: #e3f2fd;
  color: #2196f3;
}

.zoom-btn:active {
  background-color: #bbdefb;
}

.zoom-level {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 52px;
  height: 32px;
  padding: 0 8px;
  border: none;
  border-radius: 4px;
  background-color: transparent;
  color: #333;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}

.zoom-level:hover {
  background-color: #e3f2fd;
  color: #2196f3;
}

.zoom-level:active {
  background-color: #bbdefb;
}
</style>
