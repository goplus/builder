<template>
  <div class="description-modal">
    <!-- 遮罩层 -->
    <div v-if="visible" class="modal-overlay" @click="handleClose">
      <!-- 弹窗主体 -->
      <div class="modal-content" @click.stop>
        <!-- 标题栏 -->
        <div class="modal-header">
          <h3 class="modal-title">{{ $t({ en: 'Help Information', zh: '帮助信息' }) }}</h3>
          <button class="close-btn" @click="handleClose">×</button>
        </div>

        <!-- 内容区域 -->
        <div class="modal-body">
          <div class="content-wrapper">
            {{ $t({ en: descriptionEn, zh: descriptionZh }) }}
            <div class="description-example">
              <!-- 图片对比滑块 -->
              <div class="image-comparison-container">
                <div ref="comparisonWrapper" class="comparison-wrapper">
                  <!-- 原图 (before) -->
                  <div class="image-before">
                    <img src="./images/before.png" alt="美化前" draggable="false" />
                    <div class="image-label">美化前</div>
                  </div>

                  <!-- 处理后的图 (after) -->
                  <div class="image-after" :style="{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }">
                    <img src="./images/after.png" alt="美化后" draggable="false" />
                    <div class="image-label">美化后</div>
                  </div>

                  <!-- 滑块控制器 -->
                  <div
                    class="slider-control"
                    :style="{ left: `${sliderPosition}%` }"
                    @mousedown="startDrag"
                    @touchstart="startDrag"
                  >
                    <div class="slider-line"></div>
                    <div class="slider-handle">
                      <div class="slider-arrow left">‹</div>
                      <div class="slider-arrow right">›</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'

// Props
interface Props {
  visible: boolean
}
const descriptionEn = 'Image beautification function can help you quickly beautify images and improve image quality.'
const descriptionZh = '图片美化功能可以帮助您快速美化图片，提高图片质量。'

withDefaults(defineProps<Props>(), {
  visible: false
})

// Emits
interface Emits {
  (e: 'update:visible', visible: boolean): void
}

const emit = defineEmits<Emits>()

// 图片对比滑块相关
const comparisonWrapper = ref<HTMLElement>()
const sliderPosition = ref(50) // 滑块位置百分比，默认50%
const isDragging = ref(false)

// 处理关闭
const handleClose = (): void => {
  emit('update:visible', false)
}

// 开始拖拽
const startDrag = (event: MouseEvent | TouchEvent): void => {
  event.preventDefault()
  isDragging.value = true

  // 添加全局事件监听
  document.addEventListener('mousemove', handleDrag)
  document.addEventListener('mouseup', stopDrag)
  document.addEventListener('touchmove', handleDrag)
  document.addEventListener('touchend', stopDrag)
}

// 处理拖拽
const handleDrag = (event: MouseEvent | TouchEvent): void => {
  if (!isDragging.value || !comparisonWrapper.value) return

  event.preventDefault()

  const rect = comparisonWrapper.value.getBoundingClientRect()
  let clientX: number

  if (event instanceof MouseEvent) {
    clientX = event.clientX
  } else {
    clientX = event.touches[0].clientX
  }

  const x = clientX - rect.left
  const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100))

  sliderPosition.value = percentage
}

// 停止拖拽
const stopDrag = (): void => {
  isDragging.value = false

  // 移除全局事件监听
  document.removeEventListener('mousemove', handleDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('touchmove', handleDrag)
  document.removeEventListener('touchend', stopDrag)
}

// 组件卸载时清理事件监听
onUnmounted(() => {
  document.removeEventListener('mousemove', handleDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('touchmove', handleDrag)
  document.removeEventListener('touchend', stopDrag)
})
</script>

<style scoped>
.description-modal {
  position: relative;
  z-index: 1001; /* 比主弹窗层级更高 */
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1001;
}

.modal-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 500px;
  max-height: 70vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.modal-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  color: #6b7280;
  cursor: pointer;
  padding: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover {
  background-color: #f3f4f6;
  color: #374151;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.content-wrapper {
  text-align: center;
  font-size: 16px;
  font-weight: bold;
  color: #374151;
  padding: 40px 20px;
}

/* 图片对比滑块样式 */
.image-comparison-container {
  margin-top: 20px;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
}

.comparison-wrapper {
  position: relative;
  width: 100%;
  height: 250px;
  overflow: hidden;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  cursor: ew-resize;
  user-select: none;
}

.image-before,
.image-after {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.image-before img,
.image-after img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.image-after {
  overflow: hidden;
}

.image-label {
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  pointer-events: none;
}

.image-after .image-label {
  right: auto;
  left: 12px;
}

.slider-control {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  cursor: ew-resize;
  z-index: 10;
  transform: translateX(-1px);
}

.slider-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #ffffff;
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.3);
}

.slider-handle {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 40px;
  height: 40px;
  background: #ffffff;
  border-radius: 50%;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
}

.slider-handle:hover {
  transform: translate(-50%, -50%) scale(1.1);
}

.slider-arrow {
  font-size: 14px;
  color: #666;
  font-weight: bold;
  line-height: 1;
}

.slider-arrow.left {
  margin-right: 2px;
}

.slider-arrow.right {
  margin-left: 2px;
}

/* 拖拽时的样式 */
.comparison-wrapper:active .slider-handle {
  transform: translate(-50%, -50%) scale(1.05);
}
</style>
