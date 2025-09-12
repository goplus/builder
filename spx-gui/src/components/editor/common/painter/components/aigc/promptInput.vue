<template>
  <!-- 提示词输入 -->
  <div class="form-group">
    <label class="form-label">{{ $t({ en: 'Describe the image you want', zh: '描述您想要的图片' }) }}</label>

    <!-- 模板类型选择按钮 -->
    <div class="template-buttons">
      <button
        v-for="templateType in templateTypes"
        :key="templateType.key"
        :class="['template-button', { active: activeTemplate === templateType.key }]"
        @click="switchTemplate(templateType.key)"
      >
        {{ templateType.label }}
      </button>
    </div>

    <!-- Smart模式：直接textarea输入 -->
    <div v-if="activeTemplate === 'smart'" class="prompt-editor">
      <prompt-editor v-model="smartInput" @update:model-value="updateSmartPrompt" />
    </div>

    <!-- 模板模式：填空式输入 -->
    <div v-else class="prompt-template">
      <template v-for="(part, index) in templateParts" :key="index">
        <span v-if="part.type === 'text'" class="template-text">{{ part.content }}</span>
        <n-input
          v-else
          v-model:value="inputs[part.index!]"
          :placeholder="part.placeholder"
          class="template-input"
          @update:value="updatePrompt"
        />
      </template>
    </div>
    <div v-if="previewText && activeTemplate !== 'smart'" class="preview-section">
      <div class="preview-label">{{ $t({ en: 'Preview', zh: '预览' }) }}:</div>
      <div class="preview-content">{{ previewText }}</div>
    </div>
    <div class="input-hint">
      {{
        activeTemplate === 'smart'
          ? $t({ en: 'Tip: Enter your complete prompt description', zh: '提示：输入您的完整提示词描述' })
          : $t({ en: 'Tip: Fill in the blanks to complete your prompt', zh: '提示：填写空白处以完成您的提示词' })
      }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { NInput } from 'naive-ui'
import PromptEditor from './promptEditor.vue'

// Props
interface Props {
  modelValue: string
}

defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const fullFilled = ref(false)

// Smart模式的输入内容
const smartInput = ref('')

// 定义不同类型的模板
const templates = {
  sprite: '一个（可爱）的（猫咪），颜色是（橘色）',
  prop: '一个（金币），颜色是（金色）',
  decoration: '一个（中世纪）风格的（帽子），颜色是（灰色）',
  smart: ''
}

// 模板类型定义
const templateTypes = [
  { key: 'sprite' as const, label: '精灵' },
  { key: 'prop' as const, label: '道具' },
  { key: 'decoration' as const, label: '装饰' },
  { key: 'smart' as const, label: '智能' }
] as const

// 当前激活的模板类型
const activeTemplate = ref<keyof typeof templates>('sprite')

// 当前模板内容
const template = computed(() => (templates[activeTemplate.value] !== 'smart' ? templates[activeTemplate.value] : ''))

// 解析模板的接口
interface TemplatePart {
  type: 'text' | 'input'
  content?: string
  index?: number
  placeholder?: string
}

// 解析模板
const templateParts = computed((): TemplatePart[] => {
  const parts: TemplatePart[] = []
  const templateStr = template.value
  let inputIndex = 0
  let currentPos = 0

  // 查找所有的()占位符
  const regex = /（[^）]*）/g
  let match

  while ((match = regex.exec(templateStr)) !== null) {
    // 添加前面的固定文本
    if (match.index > currentPos) {
      parts.push({
        type: 'text',
        content: templateStr.slice(currentPos, match.index)
      })
    }

    // 添加输入框
    const placeholderText = match[0].slice(1, -1) // 去掉（）
    parts.push({
      type: 'input',
      index: inputIndex,
      placeholder: placeholderText || ``
    })

    inputIndex++
    currentPos = match.index + match[0].length
  }

  // 添加最后的固定文本
  if (currentPos < templateStr.length) {
    parts.push({
      type: 'text',
      content: templateStr.slice(currentPos)
    })
  }

  return parts
})

// 输入框的值数组
const inputs = ref<string[]>([])

// 确保inputs数组长度与输入框数量一致
const inputCount = computed(() => templateParts.value.filter((part) => part.type === 'input').length)

// 监听模板变化，重新初始化inputs数组
watch(
  [template, inputCount],
  () => {
    inputs.value = new Array(inputCount.value).fill('')
  },
  { immediate: true }
)

// 切换模板
const switchTemplate = (templateKey: keyof typeof templates) => {
  activeTemplate.value = templateKey
  smartInput.value = ''
}

// 预览文本
const previewText = computed(() => {
  let result = template.value
  let inputIndex = 0

  result = result.replace(/（[^）]*）/g, () => {
    const value = inputs.value[inputIndex] || ''
    inputIndex++
    return value
  })

  return result
})

// 更新提示词
const updatePrompt = () => {
  const prompt = previewText.value
  emit('update:modelValue', prompt)
  const filled = inputs.value.every((input) => input.trim() !== '')
  fullFilled.value = filled
}

// Smart模式更新提示词
const updateSmartPrompt = () => {
  emit('update:modelValue', smartInput.value)
  fullFilled.value = smartInput.value.trim() !== ''
}

defineExpose({
  fullFilled
})
</script>

<style scoped>
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

.template-buttons {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.template-button {
  padding: 8px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 6px;
  background: #ffffff;
  color: #6b7280;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.template-button:hover {
  border-color: #d1d5db;
  background: #f9fafb;
}

.template-button.active {
  border-color: #3b82f6;
  background: #3b82f6;
  color: #ffffff;
}

.prompt-template {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  min-height: 50px;
  background: #f9fafb;
}

.template-text {
  font-size: 14px;
  color: #374151;
  white-space: nowrap;
}

.template-input {
  width: 5em;
  min-width: 5em;
}

.textarea-input {
  width: 100%;
  height: 100px;
  min-width: 100%;
}

.preview-section {
  margin-top: 12px;
  padding: 12px;
  background: #f3f4f6;
  border-radius: 6px;
  border-left: 4px solid #3b82f6;
}

.preview-label {
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  margin-bottom: 4px;
}

.preview-content {
  font-size: 14px;
  color: #374151;
  line-height: 1.5;
  min-height: 20px;
}

.input-hint {
  margin-top: 6px;
  font-size: 12px;
  color: #6b7280;
}
</style>
