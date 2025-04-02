<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from '@/utils/i18n'
import { UIButton } from '@/components/ui'
import CodeBlock from './CodeBlock.vue'
import { toolResultCollector } from '@/components/copilot/mcp/collector'
const props = defineProps<{
  id: string
  /** 服务器名称 */
  server?: string
  /** 工具名称 */
  tool: string
  /** 工具参数（JSON格式字符串） */
  arguments: string
}>()
const i18n = useI18n()
const { t } = i18n
// 简化：直接使用工具收集器跟踪状态
const taskInfo = computed(() => toolResultCollector.getOrCreateTask({
  id: props.id,
  tool: props.tool.trim(),
  server: props.server,
  args: props.arguments
}))
// 界面状态
const isExpanded = ref(false)
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
  if (!taskInfo.value.result) return ''
  try {
    return JSON.stringify(taskInfo.value.result, null, 2)
  } catch (e) {
    return String(taskInfo.value.result)
  }
})
// 状态样式
const statusClass = computed(() => {
  return {
    'is-pending': taskInfo.value.status === 'pending',
    'is-running': taskInfo.value.status === 'running',
    'is-success': taskInfo.value.status === 'success',
    'is-error': taskInfo.value.status === 'error'
  }
})
// 状态文字
const statusText = computed(() => {
  switch (taskInfo.value.status) {
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
// 简化：执行工具只需调用收集器的执行方法
async function executeTool() {
  if (taskInfo.value.status === 'running') return
  
  // 委托给工具收集器执行
  toolResultCollector.executeTask(taskInfo.value.id)
}
// 切换展开/折叠状态
function toggleExpand() {
  isExpanded.value = !isExpanded.value
}
function statusRunning() {
  return taskInfo.value.status === 'running'
}
// 组件挂载时自动执行工具
onMounted(() => {
  // 如果工具还未执行且不是错误状态，自动执行
  if (taskInfo.value.status === 'pending') {
    try {
      // 验证参数
      JSON.parse(props.arguments)
      executeTool()
    } catch (e) {
      // 参数不是有效的JSON，标记为错误
      toolResultCollector.markTaskError(taskInfo.value.id, 'Invalid JSON arguments')
    }
  }
})
</script>

<template>
  <div class="mcp-tool" :class="statusClass">
    <div class="tool-header" @click="toggleExpand">
      <div class="tool-info">
        <span class="tool-icon custom-icon">{{ isExpanded ? '▼' : '▶' }}</span>
        <span class="tool-name">{{ tool }}</span>
      </div>

      <div class="tool-actions">
        <span class="tool-status" :class="statusClass">{{ statusText }}</span>
        <UIButton 
          v-if="taskInfo.status === 'error'"
          type="primary"
          size="small"
          :loading="statusRunning()"
          @click.stop="executeTool"
        >
          {{ taskInfo.status === 'error' 
              ? t({ en: 'Retry', zh: '重试' }) 
              : t({ en: 'Execute', zh: '执行' }) 
          }}
        </UIButton>
      </div>
    </div>

    <div v-if="isExpanded" class="tool-content">
      <div class="args-section">
        <div class="section-label">{{ t({ en: 'Arguments', zh: '参数' }) }}</div>
        <CodeBlock :code="formattedArguments" language="json" />
      </div>

      <div v-if="taskInfo.status === 'success'" class="result-section">
        <div class="section-label">{{ t({ en: 'Result', zh: '结果' }) }}</div>
        <CodeBlock :code="formattedResult" language="json" />
      </div>

      <div v-if="taskInfo.status === 'error'" class="error-section">
        <div class="section-label">{{ t({ en: 'Error', zh: '错误' }) }}</div>
        <div class="error-message">{{ taskInfo.errorMessage }}</div>
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
    border-color: grey;
  }
  
  &.is-running {
    border-color: blue;
    background-color: blue;
  }
  
  &.is-success {
    border-color: green;
    background-color: green;
  }
  
  &.is-error {
    border-color: red;
    background-color: red;
  }
  
  .tool-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 5px 10px;
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
        color: gray;
        
        &.is-running {
          color: blue;
        }
        
        &.is-success {
          color: green;
          font-weight: 500;
        }
        
        &.is-error {
          color: red;
          font-weight: 500;
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
  
  .custom-icon {
    font-size: 10px;
    display: inline-flex;
    width: 16px;
    height: 16px;
    align-items: center;
    justify-content: center;
  }
}
</style>