<template>
  <div class="ai-generate-dialog">
    <!-- 遮罩层 -->
    <div 
      v-if="visible" 
      class="dialog-overlay"
      @click="handleCancel"
    >
      <!-- 弹窗主体 -->
      <div 
        class="dialog-content"
        @click.stop
      >
        <!-- 标题栏 -->
        <div class="dialog-header">
          <h3 class="dialog-title">AI生成图片</h3>
          <button 
            class="close-btn"
            @click="handleCancel"
          >
            ×
          </button>
        </div>

        <!-- 内容区域 -->
        <div class="dialog-body">
          <div class="dialog-content-wrapper">
            <!-- 左侧表单区域 -->
            <div class="form-section">
              <!-- 模型选择 -->
              <div class="form-group">
                <label class="form-label">选择生成模型</label>
                <div class="model-selector">
                  <div 
                    class="model-option"
                    :class="{ active: selectedModel === 'png' }"
                    @click="selectedModel = 'png'"
                  >
                    <div class="model-icon">🖼️</div>
                    <div class="model-info">
                      <div class="model-name">PNG图片</div>
                      <div class="model-desc">生成高质量位图图片</div>
                    </div>
                  </div>
                  <div 
                    class="model-option"
                    :class="{ active: selectedModel === 'svg' }"
                    @click="selectedModel = 'svg'"
                  >
                    <div class="model-icon">📐</div>
                    <div class="model-info">
                      <div class="model-name">SVG矢量</div>
                      <div class="model-desc">生成可缩放矢量图形</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 提示词输入 -->
              <div class="form-group">
                <label class="form-label">描述您想要的图片</label>
                <textarea
                  v-model="prompt"
                  class="prompt-input"
                  placeholder="请详细描述您想要生成的图片内容，例如：一只可爱的卡通猫咪，坐在彩虹上，背景是蓝天白云..."
                  rows="4"
                ></textarea>
                <div class="input-hint">
                  提示：描述越详细，生成的图片效果越好
                </div>
              </div>

              <!-- 生成按钮 -->
              <div class="form-group">
                <button 
                  class="generate-btn"
                  :disabled="!prompt.trim() || isGenerating"
                  @click="handleGenerate"
                >
                  <span v-if="isGenerating" class="loading-spinner"></span>
                  {{ isGenerating ? '生成中...' : '生成图片' }}
                </button>
              </div>
            </div>

            <!-- 右侧预览区域 -->
            <div class="preview-section" :class="{ visible: previewUrl || isGenerating }">
              <label class="form-label">预览效果</label>
              <div class="preview-container">
                <div v-if="isGenerating" class="preview-loading">
                  <div class="loading-spinner large"></div>
                  <div class="loading-text">AI正在为您生成图片...</div>
                </div>
                <div v-else-if="previewUrl" class="preview-image-wrapper">
                  <img 
                    :src="previewUrl" 
                    alt="AI生成的图片预览"
                    class="preview-image"
                    @load="handleImageLoad"
                    @error="handleImageError"
                  />
                  <!-- <div class="preview-info">
                    <span class="model-tag">{{ selectedModel.toUpperCase() }}</span>
                    <span class="size-info">{{ imageSize }}</span>
                  </div> -->
                </div>
                <div v-else class="preview-placeholder">
                  <div class="placeholder-icon">🖼️</div>
                  <div class="placeholder-text">生成的图片将在这里预览</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 底部按钮 -->
        <div class="dialog-footer">
          <button 
            class="btn btn-secondary"
            @click="handleCancel"
          >
            取消
          </button>
          <button 
            class="btn btn-primary"
            :disabled="!previewUrl || isGenerating"
            @click="handleConfirm"
          >
            确认使用
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { generateImage, generateSvgDirect } from '@/apis/picgc'

// Props
interface Props {
  visible: boolean
}

const props = withDefaults(defineProps<Props>(), {
  visible: false
})

// Emits
const emit = defineEmits<{
  'update:visible': [value: boolean]
  'confirm': [data: { 
    model: string; 
    prompt: string; 
    url?: string; 
    svgContent?: string;
  }]
  'cancel': []
}>()

// 响应式数据
const selectedModel = ref<'png' | 'svg'>('png')
const prompt = ref('')
const previewUrl = ref('')
const isGenerating = ref(false)
const imageSize = ref('')

// 存储SVG原始代码
const svgRawContent = ref('')

// 方法
const handleGenerate = async () => {
  if (!prompt.value.trim()) return
  
  isGenerating.value = true
  previewUrl.value = ''
  
  try {
    // TODO: 这里需要调用实际的AI生成API
    // 目前使用模拟数据
    // await simulateGeneration()

    // // 模拟生成结果
    // previewUrl.value = generateMockImageUrl()
    // imageSize.value = selectedModel.value === 'png' ? '512x512' : '矢量图'

    await handleRealGenerate()
    // previewUrl 在 handleRealGenerate 中已经设置
    // imageSize 在 handleRealGenerate 中已经设置
    
  } catch (error) {
    console.error('生成图片失败:', error)
    // TODO: 显示错误提示
  } finally {
    isGenerating.value = false
  }
}

const handleConfirm = () => {
  if (!previewUrl.value) return
  
  const confirmData: any = {
    model: selectedModel.value,
    prompt: prompt.value
  }
  
  if (selectedModel.value === 'svg') {
    // SVG模式：传递原始SVG代码
    confirmData.svgContent = svgRawContent.value
    confirmData.url = previewUrl.value // 用于预览的blob URL
    // console.log('SVG确认数据:', { svgContent: svgRawContent.value })
  } else {
    // PNG模式：传递图片URL
    confirmData.url = previewUrl.value
    // console.log('PNG确认数据:', { url: previewUrl.value })
  }
  
  emit('confirm', confirmData)
  
  handleCancel()
}

const handleCancel = () => {
  emit('update:visible', false)
  emit('cancel')
  
  // 重置状态
  setTimeout(() => {
    prompt.value = ''
    previewUrl.value = ''
    isGenerating.value = false
    selectedModel.value = 'png'
  }, 300)
}

const handleImageLoad = () => {
//   console.log('图片加载成功')
}

const handleImageError = () => {
  console.error('图片加载失败')
  previewUrl.value = ''
}

// 模拟生成过程
const simulateGeneration = () => {
  return new Promise(resolve => {
    setTimeout(resolve, 2000) // 模拟2秒生成时间
  })
}

// 实际的AI图片生成函数
const handleRealGenerate = async () => {
  if (!prompt.value.trim()) return
  
  isGenerating.value = true
  previewUrl.value = ''
  svgRawContent.value = ''
  
  try {
    if (selectedModel.value === 'svg') {
      const svgResult = await generateSvgDirect(prompt.value, {
        style: 'FLAT_VECTOR' // developing
      })
      
      // 直接获得SVG内容
      svgRawContent.value = svgResult.svgContent
      
      // 创建blob URL用于预览 - 参照mock方式处理
      const blob = new Blob([svgResult.svgContent], { type: 'image/svg+xml' })
      previewUrl.value = URL.createObjectURL(blob)
      
      imageSize.value = `${svgResult.width}x${svgResult.height} (矢量图)`
    } else {
      // PNG mod
      const result = await generateImage(prompt.value, {
        style: 'FLAT_VECTOR' // developing
      })
      
      previewUrl.value = result.png_url
      imageSize.value = `${result.width}x${result.height}`
    }
    
  } catch (error) {
    console.error('生成图片失败:', error)
    
    let errorMessage = '图片生成失败，请稍后重试'
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        errorMessage = '生成超时，请尝试简化描述或稍后重试'
      } else if (error.message.includes('network')) {
        errorMessage = '网络连接异常，请检查网络连接'
      } else if (error.message.includes('400')) {
        errorMessage = '请求参数错误，请检查提示词长度（至少3个字符）'
      } else if (error.message.includes('500')) {
        errorMessage = '服务器内部错误，请稍后重试'
      }
    }
    
    alert(errorMessage)
    
  } finally {
    isGenerating.value = false
  }
}

// 监听visible变化
watch(() => props.visible, (newVal) => {
  if (!newVal) {
    // 弹窗关闭时重置状态
    setTimeout(() => {
      prompt.value = ''
      previewUrl.value = ''
      isGenerating.value = false
    }, 300)
  }
})
</script>

<style scoped>
.ai-generate-dialog {
  position: relative;
  z-index: 1000;
}

.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 900px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  animation: dialogSlideIn 0.3s ease-out;
}

@keyframes dialogSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.dialog-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #6b7280;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.dialog-body {
  padding: 24px;
}

.dialog-content-wrapper {
  display: flex;
  gap: 24px;
  min-height: 400px;
}

.form-section {
  flex: 1;
  min-width: 0;
}

.preview-section {
  flex: 1;
  min-width: 300px;
  display: flex;
  flex-direction: column;
}

.form-group {
  margin-bottom: 24px;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #374151;
  font-size: 14px;
}

.model-selector {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.model-option {
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 12px;
}

.model-option:hover {
  border-color: #d1d5db;
  background: #f9fafb;
}

.model-option.active {
  border-color: #3b82f6;
  background: #eff6ff;
}

.model-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.model-info {
  flex: 1;
}

.model-name {
  font-weight: 500;
  color: #1f2937;
  margin-bottom: 4px;
}

.model-desc {
  font-size: 12px;
  color: #6b7280;
}

.prompt-input {
  width: 100%;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  font-size: 14px;
  line-height: 1.5;
  resize: vertical;
  min-height: 100px;
  transition: border-color 0.2s;
}

.prompt-input:focus {
  outline: none;
  border-color: #3b82f6;
}

.input-hint {
  margin-top: 6px;
  font-size: 12px;
  color: #6b7280;
}

.generate-btn {
  width: 100%;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.generate-btn:hover:not(:disabled) {
  background: #2563eb;
}

.generate-btn:disabled {
  background: #d1d5db;
  cursor: not-allowed;
}

.preview-section .form-label {
  margin-bottom: 12px;
}

.preview-container {
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  padding: 24px;
  text-align: center;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}

.preview-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: #9ca3af;
}

.placeholder-icon {
  font-size: 48px;
  opacity: 0.5;
}

.placeholder-text {
  font-size: 14px;
  color: #6b7280;
}

.preview-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: #6b7280;
}

.loading-text {
  font-size: 14px;
}

.preview-image-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.preview-image {
  max-width: 100%;
  max-height: 250px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  object-fit: contain;
}

.preview-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.model-tag {
  background: #3b82f6;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.size-info {
  color: #6b7280;
  font-size: 12px;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #e5e7eb;
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-spinner.large {
  width: 32px;
  height: 32px;
  border-width: 3px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
  border-radius: 0 0 12px 12px;
}

.btn {
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-primary:disabled {
  background: #d1d5db;
  cursor: not-allowed;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .dialog-content {
    max-width: 95%;
    margin: 20px;
  }
  
  .dialog-content-wrapper {
    flex-direction: column;
    min-height: auto;
  }
  
  .preview-section {
    min-width: auto;
    margin-top: 20px;
  }
  
  .preview-container {
    min-height: 200px;
  }
}
</style>
