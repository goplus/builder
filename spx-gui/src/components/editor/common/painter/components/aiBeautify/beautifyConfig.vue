<template>
  <div class="beautify-config">
    <!-- 配置内容区域（可滚动） -->
    <div class="config-body">
      <div class="config-content">
        <!-- 第一行：风格选择 -->
        <div class="config-row">
          <div class="config-section full-width">
            <div class="section-header">
              <h3>{{ t({ en: 'Style Selection', zh: '风格选择' }) }}</h3>
              <span class="section-description">
                {{ t({ en: 'Choose a theme style for your image', zh: '为您的图像选择主题风格' }) }}
              </span>
            </div>
            <div class="section-content">
              <ModelSelector ref="modelSelectorRef" />
            </div>
          </div>
        </div>

        <!-- 第二行：提示词 -->
        <div class="config-row">
          <!-- 正面提示词 -->
          <div class="config-section half-width">
            <div class="section-header">
              <h3>{{ t({ en: 'Positive Prompt', zh: '正面提示词' }) }}</h3>
              <span class="section-description">
                {{ t({ en: 'What you want to see', zh: '希望看到的内容' }) }}
              </span>
            </div>
            <div class="section-content">
              <textarea
                v-model="localConfig.positivePrompt"
                class="prompt-textarea"
                :placeholder="
                  t({
                    en: 'perfectify, beautify, enrich details...',
                    zh: '完善作品，美化线条，丰富细节...'
                  })
                "
                rows="4"
              />
              <div class="prompt-counter">{{ localConfig.positivePrompt.length }}/500</div>
            </div>
          </div>

          <!-- 负面提示词 -->
          <div class="config-section half-width">
            <div class="section-header">
              <h3>{{ t({ en: 'Negative Prompt', zh: '负面提示词' }) }}</h3>
              <span class="section-description">
                {{ t({ en: 'What you want to avoid', zh: '希望避免的内容' }) }}
              </span>
            </div>
            <div class="section-content">
              <textarea
                v-model="localConfig.negativePrompt"
                class="prompt-textarea"
                :placeholder="
                  t({
                    en: 'text, watermark...',
                    zh: '文字，水印...'
                  })
                "
                rows="4"
              />
              <div class="prompt-counter">{{ localConfig.negativePrompt.length }}/300</div>
            </div>
          </div>
        </div>

        <!-- 第三行：变换强度 -->
        <div class="config-row">
          <div class="config-section full-width">
            <div class="section-header">
              <h3>{{ t({ en: 'Transformation Strength', zh: '变换强度' }) }}</h3>
              <span class="section-description">
                {{ t({ en: 'Control how much the AI will modify your image', zh: '控制AI对您图像的修改程度' }) }}
              </span>
            </div>
            <div class="section-content">
              <div class="strength-control">
                <div class="strength-labels">
                  <span class="strength-label">
                    {{ t({ en: 'Weak', zh: '轻微' }) }}
                  </span>
                  <span class="strength-value">{{ localConfig.strength }}%</span>
                  <span class="strength-label">
                    {{ t({ en: 'Strong', zh: '强烈' }) }}
                  </span>
                </div>
                <div class="strength-slider-container">
                  <input
                    v-model="localConfig.strength"
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    class="strength-slider"
                  />
                  <div class="slider-track">
                    <div class="slider-fill" :style="{ width: `${((localConfig.strength - 0) / 100) * 100}%` }"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 操作按钮（固定在底部） -->
    <div class="config-footer">
      <button class="reset-btn" @click="resetConfig">
        {{ t({ en: 'Reset', zh: '重置' }) }}
      </button>
      <button class="apply-btn" @click="applyConfig">
        {{ t({ en: 'Apply', zh: '应用' }) }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from '@/utils/i18n'
import ModelSelector from '../aigc/modelSelector.vue'
import { ModelList } from '../aigc/modelList'

const { t } = useI18n()

// Props - 接收外部配置数据
interface Props {
  config: {
    positivePrompt: string
    negativePrompt: string
    strength: number
    selectedModelId?: string
  }
}

const props = defineProps<Props>()

const modelSelectorRef = ref<InstanceType<typeof ModelSelector>>()

const localConfig = ref({
  positivePrompt: props.config.positivePrompt,
  negativePrompt: props.config.negativePrompt,
  strength: props.config.strength
})

// 获取选中的模型
const selectedModel = computed(() => {
  return modelSelectorRef.value?.selectedModel
})

watch(
  () => props.config,
  (newConfig) => {
    localConfig.value = {
      positivePrompt: newConfig.positivePrompt,
      negativePrompt: newConfig.negativePrompt,
      strength: newConfig.strength
    }
  },
  { deep: true, immediate: true }
)

// 设置选中的模型的辅助函数
const setSelectedModel = (modelId: string | undefined) => {
  if (!modelSelectorRef.value) return

  if (modelId !== undefined) {
    // 根据保存的模型ID找到对应的模型对象
    const model = ModelList.find((m) => m.id === modelId)
    if (model) {
      modelSelectorRef.value.selectedModel = model
    }
  } else {
    // 如果 selectedModelId 被清空，也清空模型选择
    modelSelectorRef.value.selectedModel = undefined
  }
}

// 组件挂载后设置初始值
onMounted(() => {
  if (props.config.selectedModelId !== undefined) {
    setSelectedModel(props.config.selectedModelId)
  }
})

// 监听 selectedModelId 的后续变化（不使用 immediate）
watch(
  () => props.config.selectedModelId,
  (newModelId) => {
    setSelectedModel(newModelId)
  }
)

// 重置配置
const resetConfig = () => {
  localConfig.value = {
    positivePrompt: '',
    negativePrompt: '',
    strength: 50
  }
  // 重置模型选择器到默认状态（无主题）
  if (modelSelectorRef.value) {
    modelSelectorRef.value.selectedModel = undefined
  }
  // 通知父组件清空 selectedModelId
  emit('reset')
}

// 应用配置
const applyConfig = () => {
  const configData = {
    positivePrompt: localConfig.value.positivePrompt,
    negativePrompt: localConfig.value.negativePrompt,
    strength: localConfig.value.strength
  }
  emit('apply', configData)
}

// 定义事件
const emit = defineEmits<{
  preview: [config: any]
  apply: [config: any]
  reset: []
}>()

// 暴露配置数据和方法
defineExpose({
  localConfig,
  selectedModel,
  modelSelectorRef,
  resetConfig
})
</script>

<style scoped lang="scss">
.beautify-config {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fafbfc;
}

.config-body {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.config-content {
  padding: 24px;
}

.config-row {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;

  &:last-child {
    margin-bottom: 0;
  }
}

.config-section {
  background: white;
  border-radius: 12px;
  border: 1px solid #e1e5e9;
  overflow: hidden;

  &.full-width {
    flex: 1;
  }

  &.half-width {
    flex: 1;
    min-width: 0;
  }

  .section-header {
    padding: 16px 20px 10px;
    border-bottom: 1px solid #f0f2f5;

    h3 {
      margin: 0 0 4px 0;
      font-size: 15px;
      font-weight: 600;
      color: #1a1a1a;
    }

    .section-description {
      font-size: 12px;
      color: #666;
      line-height: 1.4;
    }
  }

  .section-content {
    padding: 16px 20px 20px;
  }
}

.prompt-textarea {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.5;
  resize: vertical;
  transition: border-color 0.2s ease;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: #4285f4;
    box-shadow: 0 0 0 3px rgba(66, 133, 244, 0.1);
  }

  &::placeholder {
    color: #999;
  }
}

.prompt-counter {
  text-align: right;
  font-size: 12px;
  color: #666;
  margin-top: 8px;
}

.strength-control {
  .strength-labels {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;

    .strength-label {
      font-size: 13px;
      color: #666;
    }

    .strength-value {
      font-size: 16px;
      font-weight: 600;
      color: #4285f4;
      background: #f8fbff;
      padding: 4px 12px;
      border-radius: 20px;
    }
  }

  .strength-slider-container {
    position: relative;
    margin-bottom: 20px;

    .strength-slider {
      position: relative;
      width: 100%;
      height: 6px;
      background: transparent;
      outline: none;
      appearance: none;
      -webkit-appearance: none;
      cursor: pointer;
      z-index: 2;

      &::-webkit-slider-thumb {
        appearance: none;
        -webkit-appearance: none;
        width: 20px;
        height: 20px;
        background: #4285f4;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(66, 133, 244, 0.3);
        transition: all 0.2s ease;

        &:hover {
          transform: scale(1.1);
          box-shadow: 0 3px 8px rgba(66, 133, 244, 0.4);
        }
      }

      &::-moz-range-thumb {
        width: 20px;
        height: 20px;
        background: #4285f4;
        border-radius: 50%;
        cursor: pointer;
        border: none;
        box-shadow: 0 2px 6px rgba(66, 133, 244, 0.3);
      }
    }

    .slider-track {
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      height: 6px;
      background: #e1e5e9;
      border-radius: 3px;
      transform: translateY(-50%);
      pointer-events: none;
      z-index: 1;

      .slider-fill {
        height: 100%;
        background: linear-gradient(90deg, #4285f4, #34a853);
        border-radius: 3px;
        transition: width 0.2s ease;
      }
    }
  }

  .strength-presets {
    display: flex;
    gap: 8px;
    justify-content: center;

    .preset-btn {
      padding: 6px 16px;
      border: 1px solid #e1e5e9;
      background: white;
      border-radius: 20px;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
      color: #666;

      &:hover {
        border-color: #4285f4;
        color: #4285f4;
      }

      &.active {
        background: #4285f4;
        border-color: #4285f4;
        color: white;
      }
    }
  }
}

.config-footer {
  flex-shrink: 0;
  padding: 20px 24px;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
  display: flex;
  gap: 12px;
  justify-content: center;

  button {
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
    outline: none;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .reset-btn {
    background-color: #f3f4f6;
    color: #374151;

    &:hover:not(:disabled) {
      background-color: #e5e7eb;
    }
  }

  .apply-btn {
    background-color: #3b82f6;
    color: white;

    &:hover:not(:disabled) {
      background-color: #2563eb;
    }
  }
}
</style>
