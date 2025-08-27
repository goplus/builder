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
              <div class="preview-section" :class="{ visible: previewUrl || isGenerating }">
                <label class="form-label">{{ $t({ en: 'Preview', zh: '预览效果' }) }}</label>
                <div class="preview-container">
                  <div v-if="isGenerating" class="preview-loading">
                    <div class="loading-spinner large"></div>
                    <div class="loading-text">{{ $t({ en: 'AI is generating images for you...', zh: 'AI正在为您生成图片...' }) }}</div>
                  </div>
                  <div v-else-if="previewUrl" class="preview-image-wrapper">
                    <img 
                      :src="previewUrl" 
                      :alt="$t({ en: 'AI generated image preview', zh: 'AI生成的图片预览' })"
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
              :disabled="!previewUrl || isGenerating"
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
  const previewUrl = ref('')
  const isGenerating = ref(false)
  const imageSize = ref('')
  
  // 存储SVG原始代码
  const svgRawContent = ref('')
  
  // 错误处理相关状态
  const showErrorModal = ref(false)
  const errorType = ref('')


  // 获取当前选中的模型信息
  const getSelectedModel = () => {
    return modelSelectorRef.value?.selectedModel || null
  }

  // 方法
  const handleGenerate = async () => {
    if (!prompt.value.trim()) return
    
    isGenerating.value = true
    previewUrl.value = ''
    
    try {
  
      await handleRealGenerate()
      // previewUrl 在 handleRealGenerate 中已经设置
      // imageSize 在 handleRealGenerate 中已经设置
      
    } catch (error) {
      console.error('failed to generate image1:', error)
    } finally {
      isGenerating.value = false
    }
  }
  
  const handleConfirm = () => {
    if (!previewUrl.value) return
    
    const selectedModelInfo = getSelectedModel()

    const confirmData: any = {
      model: selectedModelInfo,
      prompt: prompt.value
    }
    
    // 根据模型ID判断是否为SVG模式
    const modelId = selectedModelInfo?.id || ''
    if (modelId === 'recraft' || modelId === 'claude' || modelId === 'svgio') {
      // SVG模式：传递原始SVG代码
      confirmData.svgContent = svgRawContent.value
      confirmData.url = previewUrl.value // 用于预览的blob URL
    } else {
      // PNG模式：传递图片URL
      confirmData.url = previewUrl.value
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
    }, 300)
  }
  
  const handleImageLoad = () => {
  //   console.log('图片加载成功')
  }
  
  const handleImageError = () => {
    console.error('failed to load image')
    previewUrl.value = ''
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
    previewUrl.value = ''
    svgRawContent.value = ''
    
    const selectedModelInfo = getSelectedModel()
    try {
      if (selectedModelInfo !== null)  {
        const svgResult = await generateSvgDirect(selectedModelInfo.recommended_provider, prompt.value,{
          theme: selectedModelInfo.id,
        })
        
        // 直接获得SVG内容
        svgRawContent.value = svgResult.svgContent
        
        // 创建blob URL用于预览
        const blob = new Blob([svgResult.svgContent], { type: 'image/svg+xml' })
        previewUrl.value = URL.createObjectURL(blob)
        
        imageSize.value = `${svgResult.width}x${svgResult.height}`
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
  