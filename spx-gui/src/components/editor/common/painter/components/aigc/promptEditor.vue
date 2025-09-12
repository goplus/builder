<template>
  <div class="debounced-textarea-wrapper">
    <textarea
      ref="textareaRef"
      v-model="content"
      class="textarea"
      placeholder="请在此输入内容... 输入停止后会补全请求"
      rows="8"
      @input="handleInput"
      @keydown.esc="handleEscape"
    ></textarea>
    <div
      v-show="completionSuggestions.length > 0 && showSuggestions"
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
import { ref, watch, nextTick } from 'vue'

// @ts-ignore
import getCaretCoordinates from 'textarea-caret'
import { getPrompt } from '@/apis/prompt'

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
const status = ref({ key: 'idle', text: '准备就绪' })
const completionSuggestions = ref<string[]>([])
const showSuggestions = ref(false)

// 新增：用于访问 DOM 元素和动态样式
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const dropdownStyle = ref({ top: '0px', left: '0px' })

// --- 核心方法 ---

const handleInput = () => {
  status.value = { key: 'typing', text: '正在输入...' }
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
  status.value = { key: 'saving', text: '正在补全...' }
  // console.log(`[API Call] 准备发送内容: "${content.value}"`)

  try {
    // const response = await new Promise<string[]>((resolve) => {
    //   setTimeout(() => {
    //     resolve([
    //       '生成一辆汽车，只展示车的侧面，红色车身，白色轮毂',
    //       '生成一辆跑车，金色车身，在赛道上',
    //       '生成一辆老爷车，黑白色调'
    //     ])
    //   }, 1000)
    // })
    const response = await getPrompt(content.value, 3)

    status.value = { key: 'saved', text: '已补全！' }
    completionSuggestions.value = response

    // 关键：确保在 DOM 更新后显示下拉框，并再次更新位置
    nextTick(() => {
      showSuggestions.value = true
      updateDropdownPosition() // 再次调用以确保位置正确
    })

    // console.log('[API Success] 内容补全成功!', response)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    status.value = { key: 'error', text: `请求失败: ${errorMessage}` }
    console.error(`[API Error]`, error)
  }
}

const selectSuggestion = (suggestion: string) => {
  content.value = suggestion
  showSuggestions.value = false
  completionSuggestions.value = []
}

const handleEscape = () => {
  if (showSuggestions.value) {
    showSuggestions.value = false
  }
}

// 新增：核心函数 - 计算并更新下拉框位置
const updateDropdownPosition = () => {
  if (!textareaRef.value) return

  const textarea = textareaRef.value // 获取光标在 textarea 中的像素坐标

  const caret = getCaretCoordinates(textarea, textarea.selectionEnd) // 关键修正：将 textarea 内部的滚动位置考虑进去
  // caret.top 是相对于 textarea 可视区域的顶部
  // textarea.offsetTop 是 textarea 元素相对于其 offsetParent 的距离
  // textarea.scrollTop 是 textarea 内容垂直滚动的距离
  const top = textarea.offsetTop + caret.top + caret.height - textarea.scrollTop + 5
  const left = textarea.offsetLeft + caret.left - textarea.scrollLeft // 更新样式
  dropdownStyle.value = {
    top: `${top}px`,
    left: `${left}px`
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
