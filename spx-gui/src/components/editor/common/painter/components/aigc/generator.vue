<template>
    <div class="ai-generate-dialog">
      <!-- 遮罩层 -->
      <div 
        v-if="visible" 
        class="dialog-overlay"
      >
        <!-- 弹窗主体 -->
        <div 
          class="dialog-content"
          @click.stop
        >
          <!-- 标题栏 -->
          <div class="dialog-header">
            <h3 class="dialog-title">{{ $t({ en: 'AI Generate Image', zh: 'AI生成图片' }) }}</h3>
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
                  <label class="form-label">{{ $t({ en: 'Select style that you like', zh: '请选择适合你的风格' }) }}</label>
                  <ModelSelector ref="modelSelectorRef" />
                </div>
  
                <!-- 提示词输入 -->
                <PromptInput v-model="prompt" />
  
                <!-- 生成按钮 -->
                <div class="form-group">
                  <button 
                    class="generate-btn"
                    :disabled="!prompt.trim() || isGenerating"
                    @click="handleGenerate"
                  >
                    <span v-if="isGenerating" class="loading-spinner"></span>
                    {{ isGenerating ? $t({ en: 'Generating...', zh: '生成中...' }) : $t({ en: 'Generate Image', zh: '生成图片' }) }}
                  </button>
                </div>
              </div>
  
              <!-- 右侧预览区域 -->
              <div class="preview-section" :class="{ visible: previewUrls.length > 0 || isGenerating }">
                <label class="form-label">{{ $t({ en: 'Preview', zh: '预览效果' }) }}</label>
                <div class="preview-container">
                  <div v-if="isGenerating" class="preview-loading">
                    <div class="loading-spinner large"></div>
                    <div class="loading-text">{{ $t({ en: 'AI is generating images for you...', zh: 'AI正在为您生成图片...' }) }}</div>
                  </div>
                  <div v-else-if="previewUrls.length > 0" class="preview-images-wrapper">
                    <div class="images-grid">
                      <div 
                        v-for="(url, index) in previewUrls" 
                        :key="index"
                        class="image-item"
                        :class="{ selected: selectedImageIndex === index }"
                        @click="selectImage(index)"
                      >
                        <img 
                          :src="url" 
                          :alt="$t({ en: 'AI generated image preview', zh: 'AI生成的图片预览' }) + ` ${index + 1}`"
                          class="preview-image"
                          @load="handleImageLoad"
                          @error="handleImageError"
                        />
                        <div class="image-overlay">
                          <div class="image-number">{{ index + 1 }}</div>
                          <div v-if="selectedImageIndex === index" class="selected-indicator">✓</div>
                        </div>
                      </div>
                    </div>
                    <div v-if="selectedImageIndex >= 0" class="selection-hint">
                      {{ $t({ en: `Selected image ${selectedImageIndex + 1}`, zh: `已选择图片 ${selectedImageIndex + 1}` }) }}
                    </div>
                  </div>
                  <div v-else class="preview-placeholder">
                    <div class="placeholder-icon">🖼️</div>
                    <div class="placeholder-text">{{ $t({ en: 'Generated images will be previewed here', zh: '生成的图片将在这里预览' }) }}</div>
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
              {{ $t({ en: 'Cancel', zh: '取消' }) }}
            </button>
            <button 
              class="btn btn-primary"
              :disabled="selectedImageIndex < 0 || isGenerating"
              @click="handleConfirm"
            >
              {{ $t({ en: 'Confirm Use', zh: '确认使用' }) }}
            </button>
          </div>
        </div>
      </div>
  
      <!-- 错误提示弹窗组件 -->
      <ErrorModal
        v-model:visible="showErrorModal"
        :error-type="errorType"
        @close="closeErrorModal"
        @retry="retryGeneration"
      />
    </div>
  </template>
  
  <script setup lang="ts">
import { ref, watch } from 'vue'
import { generateSvgDirect } from '@/apis/picgc'
import ErrorModal from './error.vue'
import ModelSelector from './modelSelector.vue'
import PromptInput from './promptInput.vue'

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
  
  // 模型选择器引用
  const modelSelectorRef = ref<InstanceType<typeof ModelSelector>>()

  // 响应式数据
  const prompt = ref('')
  const previewUrls = ref<string[]>([])
  const selectedImageIndex = ref<number>(-1)
  const isGenerating = ref(false)
  const imageSize = ref('')
  
  // 存储SVG原始代码
  const svgRawContents = ref<string[]>([])
  
  // 错误处理相关状态
  const showErrorModal = ref(false)
  const errorType = ref('')


  // 获取当前选中的模型信息
  const getSelectedModel = () => {
    return modelSelectorRef.value?.selectedModel || null
  }

  // 添加图片选择方法
  const selectImage = (index: number) => {
    selectedImageIndex.value = index
  }

  // 方法
  const handleGenerate = async () => {
    if (!prompt.value.trim()) return
    
    isGenerating.value = true
    previewUrls.value = []
    selectedImageIndex.value = -1
    
    try {
  
      await handleRealGenerate()
      // previewUrls 在 handleRealGenerate 中已经设置
      // imageSize 在 handleRealGenerate 中已经设置
      
    } catch (error) {
      console.error('failed to generate image1:', error)
    } finally {
      isGenerating.value = false
    }
  }
  
  const handleConfirm = () => {
    if (selectedImageIndex.value < 0 || selectedImageIndex.value >= previewUrls.value.length) return
    
    const selectedModelInfo = getSelectedModel()
    const selectedUrl = previewUrls.value[selectedImageIndex.value]
    const selectedSvgContent = svgRawContents.value[selectedImageIndex.value]

    const confirmData: any = {
      model: selectedModelInfo,
      prompt: prompt.value,
      url: selectedUrl,
      svgContent: selectedSvgContent
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
      previewUrls.value = []
      selectedImageIndex.value = -1
      isGenerating.value = false
    }, 300)
  }
  
  const handleImageLoad = () => {
  //   console.log('图片加载成功')
  }
  
  const handleImageError = () => {
    console.error('failed to load image')
    // 图片加载错误时的处理逻辑
  }
  
  // 错误处理方法
  const showError = (type: string = 'default') => {
    errorType.value = type
    showErrorModal.value = true
  }
  
  const closeErrorModal = () => {
    showErrorModal.value = false
    errorType.value = ''
  }
  
  const retryGeneration = () => {
    closeErrorModal()
    handleGenerate()
  }
  
  
  // 实际的AI图片生成函数
  const handleRealGenerate = async () => {
    if (!prompt.value.trim()) return
    
    isGenerating.value = true
    previewUrls.value = []
    svgRawContents.value = []
    selectedImageIndex.value = -1
    
    const selectedModelInfo = getSelectedModel()
    try {
      // 调用后端API生成四张图片
      let svgResult
      if (selectedModelInfo !== null) {
        svgResult = await generateSvgDirect(selectedModelInfo.recommended_provider, prompt.value, {
          theme: selectedModelInfo.id,
        })
      } else {
        svgResult = await generateSvgDirect('svgio', prompt.value, {
        })
      }
      
      // 处理返回的四张图片
      if (svgResult.svgContents && svgResult.svgContents.length > 0) {
        // 直接使用返回的blob URLs
        previewUrls.value = svgResult.svgContents.map(item => item.blob)
        // 为每个图片创建对应的SVG内容占位符（实际上这里是blob URL）
        svgRawContents.value = svgResult.svgContents.map(item => item.svgContent)
        
        imageSize.value = `${svgResult.width}x${svgResult.height}`
      }else{
        showError('server')
      }
      
    } catch (error) {
      console.error('failed to generate image:', error)
      
      let errorType = 'default'
      let errorKey = 'default'
      
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          errorType = 'timeout'
          errorKey = 'timeout'
        } else if (error.message.includes('network')) {
          errorType = 'network' 
          errorKey = 'network'
        } else if (error.message.includes('400')) {
          errorType = 'params'
          errorKey = 'params'
        } else if (error.message.includes('500')) {
          errorType = 'server'
          errorKey = 'server'
        }
      }
      if (String(error).includes('fetch') || String(error).includes('net')) {
        errorType = 'network'
        errorKey = 'network'
      }
      
      // Use a simple fallback message for script context, real i18n will be handled in template
      showError(errorType)
      
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
        previewUrls.value = []
        selectedImageIndex.value = -1
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
    width: 100%;
  }
  
  .form-label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    color: #374151;
    font-size: 14px;
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
  
  .preview-images-wrapper {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .images-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    width: 100%;
  }

  .image-item {
    position: relative;
    cursor: pointer;
    border: 2px solid transparent;
    border-radius: 8px;
    overflow: hidden;
    transition: all 0.2s ease;
    background: #f8f9fa;
  }

  .image-item:hover {
    border-color: #3b82f6;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
  }

  .image-item.selected {
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  }
  
  .preview-image {
    width: 100%;
    height: 120px;
    border-radius: 6px;
    object-fit: contain;
    background: white;
  }

  .image-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 8px;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .image-item:hover .image-overlay {
    opacity: 1;
  }

  .image-item.selected .image-overlay {
    opacity: 1;
    background: rgba(59, 130, 246, 0.1);
  }

  .image-number {
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
  }

  .selected-indicator {
    background: #3b82f6;
    color: white;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: bold;
  }

  .selection-hint {
    text-align: center;
    color: #3b82f6;
    font-size: 14px;
    font-weight: 500;
    padding: 8px;
    background: #eff6ff;
    border-radius: 6px;
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

    .images-grid {
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    .preview-image {
      height: 100px;
    }
  }
  </style>
  