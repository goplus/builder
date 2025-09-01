<template>
  <div class="model-selector">
    <div class="selector-display" @click="openModal">
      <div class="preview-section">
        <img :src="selectedModelInfo.previewImage" :alt="selectedModelInfo.name" class="preview-image" />
        <div class="model-info">
          <div class="model-name">{{ selectedModelInfo.name }}</div>
          <div class="model-description">{{ selectedModelInfo.description }}</div>
        </div>
      </div>
    </div>

    <div v-if="showModal" class="modal-overlay" @click="closeModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>请选择适合您的主题！</h3>
          <div class="header-actions">
            <button
              v-if="loadingState.hasError"
              class="retry-btn"
              :disabled="loadingState.isLoading"
              @click="retryLoadModels"
            >
              {{ loadingState.isLoading ? '加载中...' : '重试' }}
            </button>
            <button class="close-btn" @click="closeModal">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              </svg>
            </button>
          </div>
        </div>
        <div class="models-grid">
          <!-- 加载状态 -->
          <div v-if="loadingState.isLoading" class="loading-container">
            <div class="loading-spinner"></div>
            <div class="loading-text">正在加载模型列表...</div>
          </div>

          <!-- 错误状态 -->
          <div v-else-if="loadingState.hasError" class="error-container">
            <div class="error-icon">⚠️</div>
            <div class="error-message">{{ loadingState.errorMessage }}</div>
          </div>

          <!-- 模型列表 -->
          <div
            v-for="model in models"
            v-else
            :key="model.id"
            class="model-item"
            :class="{ active: prevSelectedModel?.id === model.id }"
            @click="selectModel(model)"
          >
            <img :src="model.previewImage" :alt="model.name" class="model-preview" />
            <div class="model-details">
              <div class="model-title">{{ model.name }}</div>
              <div class="model-desc">{{ model.description }}</div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="cancel-btn" @click="closeModal">取消</button>
          <button class="confirm-btn" @click="confirmSelection">确定</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { getStyleList } from '@/apis/style-list'

export interface ModelInfo {
  id: string
  name: string
  description: string
  previewImage: string
  recommended_provider: string
}

// 默认模型数据，防止网络问题导致空数据
const defaultModel: ModelInfo = {
  id: '',
  name: '无主题',
  description: '不应用任何特定主题风格',
  previewImage:
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiByeD0iNiIgZmlsbD0iI0Y1RjVGNSIvPgo8cGF0aCBkPSJNMjAgMTJMMjggMjhIMTJMMjAgMTJaIiBmaWxsPSIjQ0NDIi8+Cjwvc3ZnPgo=',
  recommended_provider: 'svgio'
}

// 加载状态管理
const loadingState = reactive({
  isLoading: false,
  hasError: false,
  errorMessage: '',
  retryCount: 0
})

const models = ref<ModelInfo[]>([defaultModel])
const getStyleListData = async () => {
  if (loadingState.isLoading) return

  loadingState.isLoading = true
  loadingState.hasError = false
  loadingState.errorMessage = ''

  try {
    const res = await getStyleList()
    if (res && res.length > 0) {
      models.value = res
      // 如果当前选中的是默认模型，切换到第一个实际模型
      if (selectedModel.value === undefined) {
        selectedModel.value = res[0]
      }
    } else {
      throw new Error('获取到空的模型列表')
    }
    loadingState.retryCount = 0
  } catch (error) {
    loadingState.hasError = true
    loadingState.errorMessage = error instanceof Error ? error.message : '未知错误'
    console.error('Error fetching style list:', error)
  } finally {
    loadingState.isLoading = false
  }
}

const selectedModel = ref<ModelInfo>()
const showModal = ref(false)

const selectedModelInfo = computed(() => {
  // 确保 models 有值且不为空
  if (!models.value || models.value.length === 0) {
    return defaultModel
  }

  const found = models.value.find((m) => m.id === selectedModel.value?.id)
  return found || models.value[0] || defaultModel
})

// 重试函数
const retryLoadModels = async () => {
  if (loadingState.retryCount >= 3) {
    console.warn('已达到最大重试次数')
    return
  }
  loadingState.retryCount++
  await getStyleListData()
}

const openModal = () => {
  showModal.value = true
  // 只有在没有加载过数据且没有正在加载时才调用API
  if (models.value.length === 1 && models.value[0].id === '' && !loadingState.isLoading) {
    getStyleListData()
  }
}

const closeModal = () => {
  prevSelectedModel.value = undefined
  showModal.value = false
}

const prevSelectedModel = ref<ModelInfo>()

const selectModel = (model: ModelInfo) => {
  prevSelectedModel.value = model
}

const confirmSelection = () => {
  selectedModel.value = prevSelectedModel.value

  closeModal()
}

defineExpose({
  selectedModel
})
</script>

<style scoped lang="scss">
.model-selector {
  position: relative;
  width: 100%;
}

.selector-display {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 60px;
}

.selector-display:hover {
  border-color: #4285f4;
  box-shadow: 0 2px 8px rgba(66, 133, 244, 0.1);
}

.preview-section {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.preview-image {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  object-fit: cover;
  background: #f5f5f5;
}

.model-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.model-name {
  font-weight: 600;
  font-size: 14px;
  color: #333;
}

.model-description {
  font-size: 12px;
  color: #666;
  line-height: 1.3;
}

.expand-icon {
  color: #666;
  transition: transform 0.2s ease;
}

.selector-display:hover .expand-icon {
  color: #4285f4;
}

.modal-overlay {
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
  animation: fadeIn 0.2s ease;
}

.modal-content {
  background: white;
  border-radius: 12px;
  max-width: 600px;
  width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e1e5e9;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: #666;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: #f5f5f5;
  color: #333;
}

.models-grid {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
}

.model-item {
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: white;
}

.model-item:hover {
  border-color: #4285f4;
  box-shadow: 0 2px 12px rgba(66, 133, 244, 0.15);
}

.model-item.active {
  border-color: #4285f4;
  background: #f8fbff;
}

.model-preview {
  border-radius: 6px;
  object-fit: contain;
  margin-bottom: 12px;
  width: 100%;
  height: 120px;
  display: block;
}

.model-details {
  text-align: center;
}

.model-title {
  font-weight: 600;
  font-size: 14px;
  color: #333;
  margin-bottom: 4px;
}

.model-desc {
  font-size: 12px;
  color: #666;
  line-height: 1.4;
}

.modal-footer {
  padding: 20px 24px;
  border-top: 1px solid #e1e5e9;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.cancel-btn,
.confirm-btn {
  padding: 8px 20px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid;
}

.cancel-btn {
  background: white;
  color: #666;
  border-color: #e1e5e9;
}

.cancel-btn:hover {
  background: #f5f5f5;
  border-color: #d1d5db;
}

.confirm-btn {
  background: #4285f4;
  color: white;
  border-color: #4285f4;
}

.confirm-btn:hover {
  background: #3367d6;
  border-color: #3367d6;
}

.retry-btn {
  padding: 6px 12px;
  border: 1px solid #4285f4;
  border-radius: 4px;
  background: white;
  color: #4285f4;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.retry-btn:hover:not(:disabled) {
  background: #4285f4;
  color: white;
}

.retry-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading-container,
.error-container {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e1e5e9;
  border-top: 3px solid #4285f4;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

.loading-text {
  color: #666;
  font-size: 14px;
}

.error-container {
  color: #d93025;
}

.error-icon {
  font-size: 32px;
  margin-bottom: 16px;
}

.error-message {
  font-size: 14px;
  margin-bottom: 16px;
  color: #666;
}

.error-retry-btn {
  padding: 8px 16px;
  border: 1px solid #d93025;
  border-radius: 4px;
  background: white;
  color: #d93025;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.error-retry-btn:hover {
  background: #d93025;
  color: white;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
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
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .models-grid {
    grid-template-columns: 1fr;
  }

  .modal-content {
    width: 95vw;
    max-height: 90vh;
  }
}
</style>
