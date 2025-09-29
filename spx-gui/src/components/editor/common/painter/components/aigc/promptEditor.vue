<template>
  <div class="debounced-textarea-wrapper">
    <textarea
      ref="textareaRef"
      v-model="content"
      class="textarea"
      :placeholder="
        t({
          en: 'Please enter content here... After input stops, it will be completed',
          zh: '请在此输入内容... 输入停止后会补全请求'
        })
      "
      rows="8"
      @input="handleInput"
      @keydown.esc="handleEscape"
    ></textarea>
    <div
      v-show="completionSuggestions !== null && completionSuggestions.length > 0 && showSuggestions"
      class="completion-dropdown"
      :style="dropdownStyle"
    >
      <ul class="suggestion-list">
        <li
          v-for="(suggestion, index) in completionSuggestions"
          :key="index"
          class="suggestion-item"
          @click="selectSuggestion(suggestion)"
        >
          {{ suggestion }}
        </li>
      </ul>
    </div>
    <div class="status-indicator">
      <span :class="['status', status.key]">{{ status.text }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, inject } from 'vue'
import { instantImageRecommend } from '@/apis/image-recommend'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
const editorCtx = useEditorCtx()
// @ts-ignore
import getCaretCoordinates from 'textarea-caret'
import { getPrompt } from '@/apis/prompt'
import { useI18n } from '@/utils/i18n'
const { t } = useI18n()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

// --- 定义 Props ---
const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  initialValue: {
    type: String,
    default: ''
  },
  delay: {
    type: Number,
    default: 750
  }
})

// --- 响应式状态 ---
const content = ref(props.modelValue || props.initialValue)
const debounceTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const status = ref({ key: 'idle', text: t({ en: 'Ready', zh: '准备就绪' }) })
const completionSuggestions = ref<string[]>([])
const showSuggestions = ref(false)
const setImmediateGenerateResult = inject('setImmediateGenerateResult') as (
  svgContents: { blob: string; svgContent: string }[]
) => void

// 新增：用于访问 DOM 元素和动态样式
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const dropdownStyle = ref({ top: '0px', left: '0px' })

// --- 核心方法 ---

const handleInput = () => {
  status.value = { key: 'typing', text: t({ en: 'Typing...', zh: '正在输入...' }) }
  showSuggestions.value = false

  if (debounceTimer.value !== null) {
    clearTimeout(debounceTimer.value)
  }

  // 关键：在输入时立即计算光标位置并更新下拉框位置
  updateDropdownPosition()

  debounceTimer.value = setTimeout(() => {
    submitContent()
  }, props.delay)
}

const submitContent = async () => {
  if (content.value.trim() === '') {
    return
  }
  status.value = { key: 'saving', text: t({ en: 'Completing...', zh: '正在补全...' }) }
  // console.log(`[API Call] 准备发送内容: "${content.value}"`)

  try {
    const projectId = editorCtx.project.id ? parseInt(editorCtx.project.id, 10) : 0
    const response = await getPrompt(content.value, 3)

    status.value = { key: 'saved', text: '已补全！' }
    // 确保响应是数组格式
    completionSuggestions.value = Array.isArray(response) ? response : []

    // 关键：确保在 DOM 更新后显示下拉框，并再次更新位置
    if (completionSuggestions.value.length > 0) {
      nextTick(() => {
        showSuggestions.value = true
        updateDropdownPosition() // 再次调用以确保位置正确
      })
    }

    let previewPics = await instantImageRecommend(projectId, content.value, {
      top_k: 4,
      theme: '' // 可以根据需要设置主题
    })

    setImmediateGenerateResult(previewPics.svgContents)
    // console.log('[API Success] 内容补全成功!', response)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : t({ en: 'Unknown error', zh: '未知错误' })
    status.value = { key: 'error', text: `${t({ en: 'Request failed', zh: '请求失败' })}: ${errorMessage}` }
    console.error(`[API Error]`, error)
  }
}

const selectSuggestion = (suggestion: string) => {
  content.value = suggestion
  showSuggestions.value = false
  completionSuggestions.value = []
  status.value = { key: 'idle', text: '准备就绪' }
}

const handleEscape = () => {
  if (showSuggestions.value) {
    showSuggestions.value = false
  }
}

// 新增：核心函数 - 计算并更新下拉框位置
const updateDropdownPosition = () => {
  if (!textareaRef.value) return

  try {
    const textarea = textareaRef.value

    // 确保 textarea 已经完全渲染并且可以访问其属性
    if (!textarea.offsetParent) return

    // 获取光标在 textarea 中的像素坐标
    const caret = getCaretCoordinates(textarea, textarea.selectionEnd)

    // 关键修正：将 textarea 内部的滚动位置考虑进去
    // caret.top 是相对于 textarea 可视区域的顶部
    // textarea.offsetTop 是 textarea 元素相对于其 offsetParent 的距离
    // textarea.scrollTop 是 textarea 内容垂直滚动的距离
    const top = textarea.offsetTop + caret.top + caret.height - textarea.scrollTop + 5
    const left = textarea.offsetLeft + caret.left - textarea.scrollLeft

    // 更新样式
    dropdownStyle.value = {
      top: `${top}px`,
      left: `${left}px`
    }
  } catch (error) {
    console.warn('Failed to update dropdown position:', error)
  }
}

// 监听 props.modelValue 的变化
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue !== content.value) {
      content.value = newValue
    }
  }
)

// 监听 content 变化，触发 update:modelValue 事件
watch(content, (newValue) => {
  emit('update:modelValue', newValue)
})
</script>

<style scoped lang="scss">
.debounced-textarea-wrapper {
  position: relative;
  width: 100%;
  max-width: 500px;
}

.textarea {
  width: 100%;
  padding: 12px;
  font-size: 16px;
  border: 1px solid #ccc;
  border-radius: 8px;
  box-sizing: border-box;
  resize: vertical;
  transition:
    border-color 0.3s,
    box-shadow 0.3s;
}

.textarea:focus {
  outline: none;
  border-color: #4a90e2;
  box-shadow: 0 0 5px rgba(74, 144, 226, 0.5);
}

.status-indicator {
  position: absolute;
  bottom: 10px;
  right: 12px;
  font-size: 14px;
  color: #999;
}

/* 补全下拉框样式 */
.completion-dropdown {
  position: absolute; /* 绝对定位 */
  max-height: 200px;
  max-width: 400px; /* 限制最大宽度 */
  min-width: 270px;
  overflow-y: auto;
  background-color: #fff;
  border: 1px solid #ccc;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

.suggestion-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.suggestion-item {
  padding: 10px 12px;
  cursor: pointer;
  white-space: pre-wrap; /* 允许换行 */
  word-wrap: break-word; /* 单词换行 */
}

.suggestion-item:hover {
  background-color: #f0f0f0;
}

/* 不同状态的不同颜色 */
.status.typing {
  color: #999;
}
.status.saving {
  color: #f39c12;
}
.status.saved {
  color: #2ecc71;
}
.status.error {
  color: #e74c3c;
  font-weight: bold;
}
</style>
