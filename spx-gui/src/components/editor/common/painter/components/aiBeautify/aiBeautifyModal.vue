<template>
  <div class="ai-beautify-dialog">
    <!-- 遮罩层 -->
    <div v-if="visible" class="dialog-overlay">
      <!-- 弹窗主体 -->
      <div class="dialog-content" @click.stop>
        <!-- 标题栏 -->
        <div class="dialog-header">
          <div class="dialog-title-container">
            <h3 class="dialog-title">{{ $t({ en: 'AI Beautify Image', zh: 'AI美化图片' }) }}</h3>
            <button class="help-btn" :title="$t({ en: 'Help', zh: '帮助' })" @click="showDescriptionModal">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </button>
          </div>
          <button class="close-btn" @click="handleCancel">×</button>
        </div>

        <!-- 内容区域 -->
        <div class="dialog-body">
          <div class="dialog-content-wrapper">
            <div class="origin-image">
              <img :src="imgSrc || ''" alt="origin" />
            </div>
            <div class="panel">
              <button class="btn btn-secondary" @click="showConfigModal">参数设置</button>
              <!-- 一个向右的箭头,贯穿整个div -->
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 5l7 7-7 7"></path>
              </svg>
            </div>
            <div class="beautify-image">
              <div v-if="isBeautifying" class="preview-loading">
                <div class="loading-spinner large"></div>
                <div class="loading-text">
                  {{ $t({ en: 'AI is beautifying your image...', zh: 'AI正在为您美化图片...' }) }}
                </div>
              </div>
              <div v-else-if="beautifyImageUrl === null" class="placeholder-content">
                <div class="placeholder-icon">🎨</div>
                <div class="placeholder-text">
                  {{ $t({ en: 'Beautified image will appear here', zh: '美化后的图片将显示在这里' }) }}
                </div>
              </div>
              <img v-else :src="beautifyImageUrl" alt="beautify" />
            </div>
          </div>
        </div>

        <!-- 底部按钮 -->
        <div class="dialog-footer">
          <button class="btn btn-secondary" :disabled="isBeautifying" @click="handleStartBeautify">
            <span v-if="isBeautifying" class="loading-spinner"></span>
            {{
              isBeautifying
                ? $t({ en: 'Beautifying...', zh: '美化中...' })
                : $t({ en: 'Start Beautify', zh: '开始美化' })
            }}
          </button>
          <button class="btn btn-primary" :disabled="disableStatus || isBeautifying" @click="handleConfirm">
            {{ $t({ en: 'Confirm', zh: '确认使用' }) }}
          </button>
        </div>
      </div>
    </div>

    <!-- 描述弹窗 -->
    <DescriptionModal v-model:visible="descriptionModalVisible" />

    <!-- 参数配置弹窗 -->
    <div v-show="configModalVisible" class="config-modal-overlay">
      <div class="config-modal-content" @click.stop>
        <div class="config-modal-header">
          <h3>{{ $t({ en: 'Beautify Configuration', zh: '美化参数配置' }) }}</h3>
        </div>
        <div class="config-modal-body">
          <BeautifyConfig
            ref="beautifyConfigRef"
            :config="beautifyConfig"
            @apply="handleConfigApply"
            @reset="handleConfigReset"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onUnmounted } from 'vue'
import DescriptionModal from './descriptionModal.vue'
import BeautifyConfig from './beautifyConfig.vue'
import { beautifyImage } from '@/apis/aiBeautify'
import { svgToPng } from '@/components/editor/common/painter/utils/svgConvert'
// 获取 BeautifyConfig 组件实例的引用
const beautifyConfigRef = ref<InstanceType<typeof BeautifyConfig>>()

const disableStatus = ref<boolean>(true)

const beautifyImageUrl = ref<string | null>(null)
const beautifyImageSvg = ref<string | null>(null)
const isBeautifying = ref<boolean>(false)
// Props
interface Props {
  visible: boolean
  imgSrc: string | null
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  imgSrc: null
})

// Emits
interface Emits {
  (e: 'update:visible', visible: boolean): void
  (e: 'confirm', data: any): void
  (e: 'cancel'): void
}

const emit = defineEmits<Emits>()

// 描述弹窗状态
const descriptionModalVisible = ref<boolean>(false)

// 参数配置面板状态
const configModalVisible = ref<boolean>(false)

// 美化配置数据
const beautifyConfig = reactive({
  positivePrompt: '',
  negativePrompt: '',
  strength: 50,
  selectedModelId: undefined as string | undefined // 保存选中的模型ID
})

// 显示描述弹窗
const showDescriptionModal = (): void => {
  descriptionModalVisible.value = true
}

// 显示参数配置面板
const showConfigModal = (): void => {
  configModalVisible.value = true
}

// 关闭参数配置面板
const closeConfigModal = (): void => {
  configModalVisible.value = false
}

// const convertImgSrcToFile = (imgSrc: string): File => {
//   const imgFile = new File([imgSrc], 'image' + Math.random().toString(36).substring(2, 15) + '.svg', { type: 'image/svg+xml' })
//   return imgFile
// }

// 处理开始美化
const handleStartBeautify = async (): Promise<void> => {
  if (!props.imgSrc) {
    if (props.imgSrc === null) {
      console.error('图片源不存在')
      return
    }
    return
  }

  isBeautifying.value = true

  try {
    const imgFile = await svgToPng(props.imgSrc)
    if (!imgFile) {
      console.error('无法将图片源转换为文件对象')
      isBeautifying.value = false
      return
    }

    const response = await beautifyImage(imgFile, beautifyConfig)
    beautifyImageUrl.value = response.blob
    beautifyImageSvg.value = response.svgContent
    disableStatus.value = false
  } catch (error) {
    console.error('美化图片失败:', error)
  } finally {
    isBeautifying.value = false
  }
}

// 处理配置应用
const handleConfigApply = (config: any): void => {
  // 更新会话级别的配置数据
  Object.assign(beautifyConfig, config)
  // 保存选中的模型ID（selectedModel 是 computed，会返回 modelSelectorRef.value?.selectedModel）
  if (beautifyConfigRef.value?.modelSelectorRef?.selectedModel) {
    beautifyConfig.selectedModelId = beautifyConfigRef.value.modelSelectorRef.selectedModel.id
  } else {
    // 如果没有选择模型，清空 selectedModelId
    beautifyConfig.selectedModelId = undefined
  }
  // 应用配置后关闭配置面板
  closeConfigModal()
}

// 处理配置重置
const handleConfigReset = (): void => {
  // 清空父组件中保存的 selectedModelId
  beautifyConfig.selectedModelId = undefined
}

// 重置配置到默认值
const resetBeautifyConfig = (): void => {
  beautifyConfig.positivePrompt = ''
  beautifyConfig.negativePrompt = ''
  beautifyConfig.strength = 50
  beautifyConfig.selectedModelId = undefined
  // 通过 beautifyConfigRef 访问其内部的 modelSelectorRef
  if (beautifyConfigRef.value?.modelSelectorRef) {
    beautifyConfigRef.value.modelSelectorRef.selectedModel = undefined
  }
}

// 处理取消
const handleCancel = (): void => {
  resetBeautifyConfig()
  disableStatus.value = true
  isBeautifying.value = false
  if (beautifyImageUrl.value) {
    destroyBlobUrl(beautifyImageUrl.value)
  }
  beautifyImageUrl.value = null
  beautifyImageSvg.value = null
  emit('update:visible', false)
  emit('cancel')
}

//销毁blob url
const destroyBlobUrl = (blobUrl: string): void => {
  if (blobUrl) {
    URL.revokeObjectURL(blobUrl)
  }
}

// 处理确认
const handleConfirm = (): void => {
  // 检查是否有美化后的图片
  if (!beautifyImageUrl.value || !beautifyImageSvg.value) {
    console.error('没有可用的美化图片')
    return
  }

  // 构建确认数据
  const confirmData: any = {
    model: beautifyConfig.selectedModelId, // 选中的模型ID
    prompt: beautifyConfig.positivePrompt, // 正向提示词
    url: beautifyImageUrl.value, // blob URL
    svgContent: beautifyImageSvg.value // SVG 内容
  }

  emit('confirm', confirmData)

  handleCancel()
}

onUnmounted(() => {
  handleCancel()
})
</script>

<style scoped>
.ai-beautify-dialog {
  position: relative;
  z-index: 1000;
}

.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  width: 90%;
  max-width: 800px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.dialog-title-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.help-btn {
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.help-btn:hover {
  background-color: #f3f4f6;
  color: #374151;
}

.dialog-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #111827;
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
  background-color: #f3f4f6;
  color: #374151;
}

.dialog-body {
  flex: 1;
  overflow-y: auto;
  padding: 32px 24px;
}

.dialog-content-wrapper {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  justify-content: center;
  height: 240px;
}

.origin-image {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  max-width: 240px;
}

.origin-image img {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  display: block;
}

.panel {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  padding: 16px;
}

.beautify-image {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f8f9fa;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  max-width: 240px;
}

.beautify-image img {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  display: block;
}

.placeholder-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #9ca3af;
  text-align: center;
  padding: 20px;
}

.placeholder-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.7;
}

.placeholder-text {
  font-size: 14px;
  font-weight: 500;
  line-height: 1.4;
}

.preview-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: #6b7280;
  height: 100%;
}

.loading-text {
  font-size: 14px;
  text-align: center;
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
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
}

.btn {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  outline: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background-color: #f3f4f6;
  color: #374151;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #e5e7eb;
}

.btn-primary {
  background-color: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #2563eb;
}

/* 参数配置弹窗样式 */
.config-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  animation: fadeIn 0.2s ease;
}

.config-modal-content {
  background: white;
  border-radius: 16px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
  width: 90%;
  max-width: 900px;
  max-height: 85vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease;
}

.config-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 28px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.config-modal-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #111827;
}

.config-modal-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
