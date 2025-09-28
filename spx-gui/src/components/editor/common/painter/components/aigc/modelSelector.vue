<template>
  <div class="model-selector">
    <div class="selector-display" @click="openModal">
      <div class="preview-section">
        <img :src="selectedModelInfo.preview_url" :alt="selectedModelInfo.name" class="preview-image" />
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
            <button class="close-btn" @click="closeModal">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              </svg>
            </button>
          </div>
        </div>
        <div class="models-grid">
          <div
            v-for="model in models"
            :key="model.id"
            class="model-item"
            :class="{ active: prevSelectedModel?.id === model.id }"
            @click="selectModel(model)"
          >
            <img :src="model.preview_url" :alt="model.name" class="model-preview" />
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
import { ref, computed } from 'vue'

export interface ModelInfo {
  id: string
  name: string
  description: string
  preview_url: string
}

import previewImage from './images/preview.jpg'
import businessImage from './images/business.jpg'
import cartoonImage from './images/cartoon.jpg'
import cyberImage from './images/cyber.jpg'
import magicImage from './images/magic.jpg'
import minimalImage from './images/minimal.jpg'
import natrueImage from './images/natrue.jpg'
import realisticImage from './images/realistic.jpg'
import retroImage from './images/retro.jpg'

const ModelList: ModelInfo[] = [
  {
    id: '',
    name: '无主题',
    description: '不应用任何特定主题风格',
    preview_url: previewImage
  },
  {
    id: 'business',
    name: '商务风格',
    description: '专业商务风格，现代企业形象',
    preview_url: businessImage
  },
  {
    id: 'cartoon',
    name: '卡通风格',
    description: '色彩鲜艳的卡通风格，适合可爱有趣的内容',
    preview_url: cartoonImage
  },
  {
    id: 'scifi',
    name: '科技风格',
    description: '未来科技风格，充满科幻元素',
    preview_url: cyberImage
  },
  {
    id: 'fantasy',
    name: '魔法风格',
    description: '充满魔法和超自然元素的奇幻风格',
    preview_url: magicImage
  },
  {
    id: 'minimal',
    name: '极简风格',
    description: '极简主义风格，简洁干净的设计',
    preview_url: minimalImage
  },
  {
    id: 'nature',
    name: '自然风格',
    description: '"自然有机风格，使用自然元素和大地色调',
    preview_url: natrueImage
  },
  {
    id: 'realistic',
    name: '写实风格',
    description: '高度写实的风格，细节丰富逼真',
    preview_url: realisticImage
  },
  {
    id: 'retro',
    name: '复古风格',
    description: '怀旧复古风格，经典老式美学',
    preview_url: retroImage
  }
]

const models = ref<ModelInfo[]>(ModelList)

const selectedModel = ref<ModelInfo>()
const showModal = ref(false)

const selectedModelInfo = computed(() => {
  const found = models.value.find((m) => m.id === selectedModel.value?.id)
  return found || models.value[0]
})

const openModal = () => {
  showModal.value = true
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
