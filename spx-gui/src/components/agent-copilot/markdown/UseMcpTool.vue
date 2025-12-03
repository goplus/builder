<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from '@/utils/i18n'
import { UIButton } from '@/components/ui'
import CodeBlock from './CodeBlock.vue'
import { useAgentCopilotCtx } from '../CopilotProvider.vue'

// Component props
const props = defineProps<{
  id: string // Unique identifier for this tool execution
  server?: string // Optional server name
  tool: string // Tool name to execute
  arguments: string // Tool arguments in JSON string format
}>()

const i18n = useI18n()
const { t } = i18n

// Ensure the tool name is trimmed
const copilotCtx = useAgentCopilotCtx()

// Check if the MCP collector is initialized
if (!copilotCtx?.mcp?.collector) {
  throw new Error('MCP collector is not initialized')
}

// Get the collector from the context
const collector = computed(() => copilotCtx.mcp.collector!)

// Track tool execution state via the collector
const taskInfo = computed(() => {
  return collector.value.getOrCreateTask({
    id: props.id,
    tool: props.tool.trim(),
    server: props.server,
    args: props.arguments
  })
})

const taskStatus = computed(() => taskInfo.value.status)

// Watch for status changes and log them
watch(
  taskStatus,
  (newStatus, oldStatus) => {
    console.warn(`[${props.id}] Status changed: ${oldStatus} -> ${newStatus}`)
  },
  { immediate: true }
)

// UI state
const isExpanded = ref(false)

// Format arguments for display
const formattedArguments = computed(() => {
  try {
    const args = JSON.parse(props.arguments)
    return JSON.stringify(args, null, 2)
  } catch {
    return props.arguments
  }
})

// Format result for display
const formattedResult = computed(() => {
  if (!taskInfo.value.result) return ''
  try {
    return JSON.stringify(taskInfo.value.result, null, 2)
  } catch {
    return String(taskInfo.value.result)
  }
})

// CSS classes based on execution status
const statusClass = computed(() => {
  return {
    'is-pending': taskStatus.value === 'pending',
    'is-running': taskStatus.value === 'running',
    'is-success': taskStatus.value === 'success',
    'is-error': taskStatus.value === 'error'
  }
})

// Human-readable status text
const statusText = computed(() => {
  switch (taskStatus.value) {
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

/**
 * Execute the tool via the collector
 * Delegates execution responsibility to the collector
 */
async function executeTool() {
  if (taskStatus.value === 'running') return

  // execute the task
  collector.value.executeTask(taskInfo.value.id)
}

/**
 * Toggle expanded/collapsed view state
 */
function toggleExpand() {
  isExpanded.value = !isExpanded.value
}

/**
 * Check if tool is currently running
 * @returns {boolean} True if tool is in running state
 */
function statusRunning() {
  return taskStatus.value === 'running'
}

// Auto-execute tool when component mounts
onMounted(() => {
  // Only execute if pending and not previously failed
  if (taskStatus.value === 'pending') {
    try {
      // Validate arguments JSON
      JSON.parse(props.arguments)
      executeTool()
    } catch {
      // Mark task as failed if arguments are invalid
      collector.value.markTaskError(taskInfo.value.id, 'Invalid JSON arguments')
    }
  }
})
</script>

<template>
  <div class="mcp-tool" :class="statusClass">
    <div class="tool-header" @click="toggleExpand">
      <div class="tool-info">
        <span class="tool-icon custom-icon">{{ isExpanded ? '▼' : '▶' }}</span>
        <span class="tool-name">{{ tool }} | {{ id }}</span>
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
          {{ taskInfo.status === 'error' ? t({ en: 'Retry', zh: '重试' }) : t({ en: 'Execute', zh: '执行' }) }}
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
/**
 * MCP Tool component container
 * Visual representation of a tool execution with status indicators
 */
.mcp-tool {
  border: 1px solid var(--ui-color-grey-300);
  border-radius: 6px;
  margin: 12px 0;
  overflow: hidden;

  /* Status-specific styling */
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

  /**
   * Tool header with expand/collapse control
   * Contains tool name and status indicators
   */
  .tool-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    cursor: pointer;
    background-color: rgba(255, 255, 255, 0.5);

    &:hover {
      background-color: rgba(255, 255, 255, 0.8);
    }

    /**
     * Left section with tool identifier
     */
    .tool-info {
      display: flex;
      align-items: center;
      gap: 8px;

      /* Expand/collapse indicator */
      .tool-icon {
        color: var(--ui-color-grey-700);
        font-size: 16px;
      }

      /* Tool name display */
      .tool-name {
        font-weight: 500;
        font-size: 14px;
        color: var (--ui-color-grey-900);
      }
    }

    /**
     * Right section with status and actions
     */
    .tool-actions {
      display: flex;
      align-items: center;
      gap: 12px;

      /* Status text indicator */
      .tool-status {
        font-size: 12px;
        color: var(--ui-color-grey-600);

        &.is-running {
          color: var(--ui-color-blue-600);
        }

        &.is-success {
          color: var(--ui-color-green-600);
          font-weight: 500;
        }

        &.is-error {
          color: var(--ui-color-red-600);
          font-weight: 500;
        }
      }
    }
  }

  /**
   * Expandable content section
   * Contains arguments, results, and error information
   */
  .tool-content {
    padding: 12px 16px;
    border-top: 1px solid var(--ui-color-grey-200);
    background-color: rgba(255, 255, 255, 0.7);

    /* Section headers */
    .section-label {
      font-weight: 500;
      margin-bottom: 6px;
      color: var(--ui-color-grey-700);
      font-size: 12px;
    }

    /* Section spacing */
    .args-section,
    .result-section,
    .error-section {
      margin-bottom: 16px;

      &:last-child {
        margin-bottom: 0;
      }
    }

    /* Error message display */
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

  /**
   * Custom icon styling for consistent display
   */
  .custom-icon {
    font-size: 10px;
    display: inline-flex;
    width: 16px;
    height: 16px;
    align-items: center;
    justify-content: center;
  }
}

/**
 * Responsive styling for smaller devices
 */
@media (max-width: 768px) {
  .mcp-tool {
    .tool-header {
      padding: 6px 10px;

      .tool-info {
        .tool-name {
          font-size: 13px;
        }
      }

      .tool-actions {
        .tool-status {
          font-size: 11px;
        }
      }
    }

    .tool-content {
      padding: 10px 12px;
    }
  }
}
</style>
