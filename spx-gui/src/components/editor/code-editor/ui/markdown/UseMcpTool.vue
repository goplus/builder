<!-- filepath: /home/wuxinyi/go/src/github.com/goplus/builder/spx-gui/src/components/editor/code-editor/ui/markdown/UseMcpTool.vue -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from '@/utils/i18n'
import { UIButton, UIIcon } from '@/components/ui'
import CodeBlock from './CodeBlock.vue'
import { client } from '@/mcp/client'

const props = defineProps<{
  /** 服务器名称 */
  serverName?: string
  /** 工具名称 */
  toolName: string
  /** 工具参数（JSON格式字符串） */
  arguments: string
}>()

const i18n = useI18n()
const { t } = i18n

// 工具调用状态
const status = ref<'pending' | 'running' | 'success' | 'error'>('pending')
const result = ref<any>(null)
const errorMessage = ref<string | null>(null)
const isExpanded = ref(true)
const isExecuting = ref(false)

// 格式化参数
const formattedArguments = computed(() => {
  try {
    const args = JSON.parse(props.arguments)
    return JSON.stringify(args, null, 2)
  } catch (e) {
    return props.arguments
  }
})

// 格式化结果
const formattedResult = computed(() => {
  if (!result.value) return ''
  return JSON.stringify(result.value, null, 2)
})

// 状态样式
const statusClass = computed(() => {
  return {
    'is-pending': status.value === 'pending',
    'is-running': status.value === 'running',
    'is-success': status.value === 'success',
    'is-error': status.value === 'error'
  }
})

// 状态文字
const statusText = computed(() => {
  switch (status.value) {
    case 'pending':
      return t({ en: 'Ready to execute', zh: '准备执行' })
    case 'running':
      return t({ en: 'Executing...', zh: '执行中...' })
    case 'success':
      return t({ en: 'Execution successful', zh: '执行成功' })
    case 'error':
      return t({ en: 'Execution failed', zh: '执行失败' })
    default:
      return ''
  }
})

// 执行工具调用
async function executeTool() {
  if (isExecuting.value) return

  isExecuting.value = true
  status.value = 'running'
  
  try {
    // 解析参数
    const args = JSON.parse(props.arguments)
    
    // 调用 MCP 工具
    result.value = await client.callTool({
      name: props.toolName.trim(),
      arguments: args
    })
    
    status.value = 'success'
    errorMessage.value = null
  } catch (error) {
    status.value = 'error'
    errorMessage.value = error instanceof Error ? error.message : String(error)
    result.value = null
  } finally {
    isExecuting.value = false
  }
}

// 切换展开/折叠状态
function toggleExpand() {
  isExpanded.value = !isExpanded.value
}

// 尝试自动解析参数，确保格式有效
onMounted(() => {
  try {
    JSON.parse(props.arguments)
  } catch (e) {
    errorMessage.value = t({ 
      en: 'Invalid JSON arguments', 
      zh: '无效的 JSON 参数' 
    })
    status.value = 'error'
  }
})
</script>

<template>
  <div class="mcp-tool" :class="[statusClass]">
    <div class="tool-header" @click="toggleExpand">
      <div class="tool-info">
        <span class="tool-icon custom-icon">{{ isExpanded ? '▼' : '▶' }}</span>
        <span class="tool-name">{{ toolName }}</span>
      </div>
      
      <div class="tool-actions">
        <span class="tool-status">{{ statusText }}</span>
        <UIButton 
          v-if="status === 'pending' || status === 'error'"
          type="primary"
          size="small"
          :loading="isExecuting"
          @click.stop="executeTool"
        >
          {{ t({ en: 'Execute', zh: '执行' }) }}
        </UIButton>
        <UIButton 
          v-else-if="status === 'success'"
          type="secondary"
          size="small"
          @click.stop="executeTool"
        >
          {{ t({ en: 'Run again', zh: '重新执行' }) }}
        </UIButton>
      </div>
    </div>
    
    <div v-if="isExpanded" class="tool-content">
      <div class="args-section">
        <div class="section-label">{{ t({ en: 'Arguments', zh: '参数' }) }}</div>
        <CodeBlock :code="formattedArguments" language="json" />
      </div>
      
      <div v-if="status === 'success'" class="result-section">
        <div class="section-label">{{ t({ en: 'Result', zh: '结果' }) }}</div>
        <CodeBlock :code="formattedResult" language="json" />
      </div>
      
      <div v-if="status === 'error'" class="error-section">
        <div class="section-label">{{ t({ en: 'Error', zh: '错误' }) }}</div>
        <div class="error-message">{{ errorMessage }}</div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.mcp-tool {
  border: 1px solid var(--ui-color-grey-300);
  border-radius: 6px;
  margin: 12px 0;
  overflow: hidden;
  
  &.is-pending {
    border-color: var(--ui-color-grey-400);
  }
  
  &.is-running {
    border-color: var(--ui-color-blue-400);
    background-color: var(--ui-color-blue-50);
  }
  
  &.is-success {
    border-color: var(--ui-color-green-400);
    background-color: var(--ui-color-green-50);
  }
  
  &.is-error {
    border-color: var(--ui-color-red-400);
    background-color: var(--ui-color-red-50);
  }
  
  .tool-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 16px;
    cursor: pointer;
    background-color: rgba(255, 255, 255, 0.5);
    
    &:hover {
      background-color: rgba(255, 255, 255, 0.8);
    }
    
    .tool-info {
      display: flex;
      align-items: center;
      gap: 8px;
      
      .tool-icon {
        color: var(--ui-color-grey-700);
        font-size: 16px;
      }
      
      .tool-name {
        font-weight: 500;
        font-size: 14px;
        color: var(--ui-color-grey-900);
      }
    }
    
    .tool-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      
      .tool-status {
        font-size: 12px;
        color: var(--ui-color-grey-700);
        
        .is-running & {
          color: var(--ui-color-blue-700);
        }
        
        .is-success & {
          color: var(--ui-color-green-700);
        }
        
        .is-error & {
          color: var(--ui-color-red-700);
        }
      }
    }
  }
  
  .tool-content {
    padding: 12px 16px;
    border-top: 1px solid var(--ui-color-grey-200);
    background-color: rgba(255, 255, 255, 0.7);
    
    .section-label {
      font-weight: 500;
      margin-bottom: 6px;
      color: var(--ui-color-grey-700);
      font-size: 12px;
    }
    
    .args-section,
    .result-section,
    .error-section {
      margin-bottom: 16px;
      
      &:last-child {
        margin-bottom: 0;
      }
    }
    
    .error-message {
      padding: 8px 12px;
      border-radius: 4px;
      background-color: var(--ui-color-red-100);
      color: var(--ui-color-red-900);
      font-family: var(--ui-font-family-code);
      font-size: 12px;
      white-space: pre-wrap;
    }
  }
}
</style>