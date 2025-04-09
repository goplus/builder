<template>
  <Transition name="slide">
    <div v-if="props.isVisible" class="mcp-debugger-panel">
      <div class="mcp-debugger-header">
        <h3>MCP Debugger</h3>
        <button class="close-btn" @click="onClose">
          <span class="close-icon">×</span>
        </button>
      </div>
      <div class="mcp-debugger-content">
        <div class="debug-section">
          <h4>连接状态</h4>
          <div class="status-container">
            <div class="status-indicator overall">
              <span
                class="status-dot"
                :class="{ active: mcpConnectionStatus.server && mcpConnectionStatus.client }"
              ></span>
              <span class="status-text">
                MCP 状态: {{ mcpConnectionStatus.server && mcpConnectionStatus.client ? '已连接' : '未连接' }}
              </span>
            </div>
          </div>
        </div>

        <div class="debug-section">
          <h4>请求历史</h4>
          <div v-if="mcpRequestHistory.length === 0" class="empty-state">
            <p>暂无请求记录</p>
          </div>
          <div v-else class="request-history">
            <div
              v-for="(request, index) in mcpRequestHistory"
              :key="index"
              class="request-item"
              :class="{ expanded: expandedItems[index] }"
              @click="toggleExpand(index)"
            >
              <div class="request-header">
                <div class="request-info">
                  <span class="request-number">#{{ mcpRequestHistory.length - index }}</span>
                  <span class="request-tool">{{ request.tool }}</span>
                  <span class="request-time">{{ request.time }}</span>
                </div>
                <span class="expand-icon">{{ expandedItems[index] ? '▼' : '▶' }}</span>
              </div>

              <div v-show="expandedItems[index]" class="request-details">
                <div class="request-section">
                  <div class="section-header" data-type="params" @click.stop="toggleSection(index, 'params')">
                    <span>请求参数</span>
                    <span class="expand-icon">{{ expandedSections[index]?.params ? '▼' : '▶' }}</span>
                  </div>
                  <pre v-show="expandedSections[index]?.params" class="params">{{
                    JSON.stringify(request.params, null, 2)
                  }}</pre>
                </div>

                <div class="request-section">
                  <div
                    class="section-header"
                    data-type="response"
                    :class="{ error: request.error }"
                    @click.stop="toggleSection(index, 'response')"
                  >
                    <span>{{ request.error ? '错误响应' : '响应结果' }}</span>
                    <span class="expand-icon">{{ expandedSections[index]?.response ? '▼' : '▶' }}</span>
                  </div>
                  <pre
                    v-show="expandedSections[index]?.response"
                    :class="{ error: request.error, response: !request.error }"
                    >{{ request.response }}</pre
                  >
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="debug-section">
          <h4>请求工具</h4>
          <div class="tool-form">
            <div class="form-group">
              <label for="toolSelect">选择工具:</label>
              <select id="toolSelect" v-model="selectedTool" class="tool-select" @change="onToolChange">
                <option value="" disabled>-- 请选择工具 --</option>
                <option v-for="tool in tools" :key="tool.name" :value="tool.name">
                  {{ tool.name }}
                </option>
              </select>
            </div>

            <div v-if="selectedTool" class="tool-description">
              {{ getToolDescription(selectedTool) }}
            </div>

            <div v-if="selectedTool && toolParams.length > 0" class="tool-params">
              <h5>参数:</h5>
              <div v-for="param in toolParams" :key="param.name" class="form-group">
                <label :for="param.name" class="param-label">
                  <span v-if="param.required" class="required-asterisk">*</span>
                  <span class="param-name">{{ param.name }}</span>
                  <UITooltip v-if="param.description">
                    <template #trigger>
                      <span class="info-icon">ⓘ</span>
                    </template>
                    {{ param.description }}
                  </UITooltip>
                </label>

                <input
                  v-if="param.type === 'string'"
                  :id="param.name"
                  v-model="paramValues[param.name]"
                  type="text"
                  class="param-input"
                  :required="param.required"
                />

                <input
                  v-if="param.type === 'number'"
                  :id="param.name"
                  v-model.number="paramValues[param.name]"
                  type="number"
                  class="param-input"
                  :required="param.required"
                />

                <div v-if="param.type === 'object'" class="nested-params">
                  <div v-for="(nestedParam, key) in param.properties" :key="key" class="form-group nested">
                    <label :for="`${param.name}-${key}`">{{ nestedParam.description || key }}:</label>
                    {{ ensureNestedObjectExists(param.name) }}
                    <input
                      v-if="nestedParam.type === 'string'"
                      :id="`${param.name}-${key}`"
                      v-model="paramValues[param.name][key]"
                      type="text"
                      class="param-input"
                      :required="param.required && param.requiredProperties && param.requiredProperties.includes(key)"
                    />
                    <input
                      v-if="nestedParam.type === 'number'"
                      :id="`${param.name}-${key}`"
                      v-model.number="paramValues[param.name][key]"
                      type="number"
                      class="param-input"
                      :required="param.required && param.requiredProperties && param.requiredProperties.includes(key)"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div class="form-actions">
              <button class="send-button" :disabled="!isFormValid || !selectedTool" @click="sendRequest">
                发送请求
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCopilotCtx } from '../CopilotProvider.vue'
import { registeredTools } from '@/components/copilot/mcp/registry'
import { UITooltip } from '@/components/ui'

/**
 * @interface McpDebuggerPanelProps
 * @description Props for the MCP Debugger panel component
 */
interface McpDebuggerPanelProps {
  isVisible: boolean // Controls the visibility of the debugger panel
}

const ctx = useCopilotCtx()

const mcpConnectionStatus = ctx.mcp.status
const mcpRequestHistory = ctx.mcp.history.requests
const mcpClient = computed(() => ctx.mcp.client.value)
// Component props and emits
const props = defineProps<McpDebuggerPanelProps>()
const emit = defineEmits<{
  (e: 'close'): void
}>()

const tools = computed(() => registeredTools.value)
// State management
const selectedTool = ref('')
const paramValues = ref<Record<string, any>>({})
const isLoading = ref(false)

// UI state for expandable sections
const expandedItems = ref<Record<number, boolean>>({})
const expandedSections = ref<Record<number, Record<string, boolean>>>({})

/**
 * Toggles the expansion state of a request history item
 * @param index - Index of the request history item
 */
function toggleExpand(index: number) {
  expandedItems.value[index] = !expandedItems.value[index]

  // Initialize section expansion state if not exists
  if (!expandedSections.value[index]) {
    expandedSections.value[index] = {
      params: false,
      response: false
    }
  }
}

/**
 * Toggles visibility of a specific section within a request history item
 * @param index - Index of the request history item
 * @param section - Section to toggle ('params' or 'response')
 */
function toggleSection(index: number, section: 'params' | 'response') {
  if (!expandedSections.value[index]) {
    expandedSections.value[index] = {
      params: false,
      response: false
    }
  }
  expandedSections.value[index][section] = !expandedSections.value[index][section]
}

/**
 * Computed property that returns the parameters for the currently selected tool
 * Transforms the tool's parameter schema into a more usable format
 */
const toolParams = computed(() => {
  if (!selectedTool.value) return []

  const tool = tools.value.find((t) => t.name === selectedTool.value)
  if (!tool) return []

  const parameters = tool.inputSchema?.properties || {}
  const required: string[] = Array.isArray(tool.inputSchema?.required) ? tool.inputSchema.required : []

  return Object.entries(parameters).map(([name, schema]: [string, any]) => ({
    name,
    type: schema.type,
    description: schema.description,
    required: required.includes(name),
    properties: schema.properties,
    requiredProperties: schema.required
  }))
})

/**
 * Validates the form based on required parameters and their values
 * Checks both top-level and nested required parameters
 */
const isFormValid = computed(() => {
  if (!selectedTool.value) return false

  for (const param of toolParams.value) {
    if (param.required && !paramValues.value[param.name]) {
      return false
    }

    if (param.type === 'object' && param.properties && param.required) {
      for (const requiredKey of param.requiredProperties) {
        if (!paramValues.value[param.name] || !paramValues.value[param.name][requiredKey]) {
          return false
        }
      }
    }
  }

  return true
})

/**
 * Handles tool selection changes
 * Resets parameter values and initializes object type parameters
 */
function onToolChange() {
  // 重置参数值
  paramValues.value = {}

  // 初始化每个参数的结构
  for (const param of toolParams.value) {
    if (param.type === 'object') {
      paramValues.value[param.name] = {}
    }
  }
}

/**
 * Retrieves the description for a given tool
 * @param toolName - Name of the tool
 * @returns Tool description or empty string if tool not found
 */
function getToolDescription(toolName: string) {
  const tool = registeredTools.value.find((t) => t.name === toolName)
  return tool ? tool.description : ''
}

/**
 * Sends a request to the selected tool with current parameter values
 * Records the request in history and handles both success and error cases
 */
async function sendRequest() {
  if (!selectedTool.value || !isFormValid.value) return

  if (!mcpClient.value) {
    console.error('MCP client is not initialized')
    return
  }

  isLoading.value = true

  try {
    const cleanParams = { ...paramValues.value }
    await mcpClient.value.callTool({
      name: selectedTool.value,
      arguments: cleanParams
    })

    // Reset form
    selectedTool.value = ''
    paramValues.value = {}
  } catch (error) {
    console.error('Tool execution failed:', error)
  } finally {
    isLoading.value = false
  }
}

/**
 * Emits close event to parent component
 */
function onClose() {
  emit('close')
}

/**
 * Helper function to ensure the nested object exists
 * @param paramName - Name of the parent parameter
 */
function ensureNestedObjectExists(paramName: string) {
  // Ensure the parent object exists
  if (!paramValues.value[paramName]) {
    paramValues.value[paramName] = {}
  }
}
</script>

<style lang="scss" scoped>
.mcp-debugger-panel {
  position: fixed;
  top: 50px;
  right: 0;
  width: 25%;
  height: calc(100vh - 50px);
  background: white;
  border-radius: 8px 0 0 8px;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 1000;

  .mcp-debugger-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 18px;
    background: linear-gradient(to right, #f8f9fa, #f1f3f5);
    border-bottom: 1px solid #e9ecef;

    h3 {
      margin: 0;
      font-size: 15px;
      font-weight: 600;
      color: #343a40;
    }

    .close-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      background: none;
      border: none;
      border-radius: 50%;
      cursor: pointer;
      transition: background-color 0.2s;

      &:hover {
        background-color: rgba(0, 0, 0, 0.05);
      }

      .close-icon {
        font-size: 18px;
        line-height: 1;
        color: #495057;
      }
    }
  }

  .mcp-debugger-content {
    flex: 1;
    overflow: auto;
    padding: 16px;

    .debug-section {
      margin-bottom: 24px;

      h4 {
        font-size: 14px;
        font-weight: 600;
        color: #495057;
        margin: 0 0 12px 0;
        padding-bottom: 8px;
        border-bottom: 1px solid #e9ecef;
      }

      h5 {
        font-size: 13px;
        font-weight: 500;
        color: #495057;
        margin: 16px 0 8px 0;
      }

      .status-indicator {
        display: flex;
        align-items: center;
        padding: 8px 12px;
        background-color: #f8f9fa;
        border-radius: 4px;

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-right: 8px;
          background-color: #868e96;

          &.active {
            background-color: #40c057;
          }
        }

        .status-text {
          font-size: 13px;
          color: #495057;
        }
      }

      .empty-state {
        padding: 20px;
        text-align: center;
        color: #adb5bd;
        background-color: #f8f9fa;
        border-radius: 4px;
        font-size: 13px;
      }

      .tool-form {
        .form-group {
          margin-bottom: 12px;

          label {
            display: block;
            font-size: 12px;
            color: #495057;
            margin-bottom: 4px;
          }

          &.nested {
            margin-left: 12px;
            margin-top: 8px;
          }
        }

        .tool-select {
          width: 100%;
          padding: 8px;
          border: 1px solid #ced4da;
          border-radius: 4px;
          font-size: 13px;
          color: #495057;
          background-color: #fff;
        }

        .param-input {
          width: 100%;
          padding: 8px;
          border: 1px solid #ced4da;
          border-radius: 4px;
          font-size: 13px;
          color: #495057;

          &:focus {
            border-color: #4dabf7;
            outline: none;
            box-shadow: 0 0 0 2px rgba(77, 171, 247, 0.2);
          }
        }

        .tool-description {
          margin: 8px 0 16px;
          padding: 8px 12px;
          background-color: #f1f3f5;
          border-radius: 4px;
          font-size: 12px;
          color: #495057;
          line-height: 1.5;
        }

        .nested-params {
          padding: 8px;
          margin-top: 4px;
          background-color: #f8f9fa;
          border-radius: 4px;
          border: 1px solid #e9ecef;
        }

        .form-actions {
          margin-top: 16px;
          text-align: right;

          .send-button {
            padding: 8px 16px;
            background-color: #228be6;
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 13px;
            cursor: pointer;
            transition: background-color 0.2s;

            &:hover {
              background-color: #1c7ed6;
            }

            &:disabled {
              background-color: #adb5bd;
              cursor: not-allowed;
            }
          }
        }
      }

      .request-history {
        .request-item {
          margin-bottom: 8px;
          border: 1px solid #e9ecef;
          border-radius: 4px;
          overflow: hidden;
          background-color: #f8f9fa;

          &.expanded {
            background-color: #fff;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          }

          .request-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 8px;
            background-color: #f8f9fa;
            cursor: pointer;
            user-select: none;
            margin-bottom: 0; // 重置之前的 margin

            &:hover {
              background-color: #f1f3f5;
            }

            .request-info {
              display: flex;
              gap: 12px;
              align-items: center;

              .request-number {
                font-size: 13px;
                color: #868e96;
                min-width: 24px;
              }

              .request-tool {
                font-size: 13px;
                font-weight: 500;
                color: #343a40;
              }

              .request-time {
                font-size: 12px;
                color: #868e96;
              }
            }
          }

          .request-details {
            border-top: 1px solid #e9ecef;

            .request-section {
              .section-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 16px;
                font-size: 12px;
                cursor: pointer;
                user-select: none;
                border-bottom: 1px solid #e9ecef;

                // Add different colors for different sections
                &[data-type='params'] {
                  background-color: #e7f5ff; // Light blue background
                  color: #1971c2; // Blue text
                  border-bottom: 1px solid #d0ebff;

                  &:hover {
                    background-color: #d0ebff;
                  }
                }

                &[data-type='response'] {
                  background-color: #ebfbee; // Light green background
                  color: #2b8a3e; // Green text
                  border-bottom: 1px solid #d3f9d8;

                  &:hover {
                    background-color: #d3f9d8;
                  }

                  &.error {
                    background-color: #fff5f5; // Light red background
                    color: #e03131; // Red text
                    border-bottom: 1px solid #ffe3e3;

                    &:hover {
                      background-color: #ffe3e3;
                    }
                  }
                }
              }

              pre {
                margin: 0;
                padding: 12px 16px;
                font-size: 12px;
                line-height: 1.5;
                background-color: #fff;
                overflow-x: auto;

                &.params {
                  border-left: 3px solid #1971c2; // Blue border
                }

                &.response {
                  border-left: 3px solid #2b8a3e; // Green border

                  &.error {
                    border-left: 3px solid #e03131; // Red border
                    color: #e03131;
                    background-color: #fff5f5;
                  }
                }
              }
            }
          }

          .expand-icon {
            font-size: 12px;
            color: #868e96;
          }
        }
      }
    }
  }
}

// 动画效果
.slide-enter-active,
.slide-leave-active {
  transition:
    transform 0.35s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.25s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
.param-label {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 6px;
  position: relative; // Add this

  .required-asterisk {
    color: #e03131;
    font-weight: bold;
    margin-right: 2px;
  }

  .param-name {
    font-weight: 500;
    color: #1a1a1a;
  }

  .info-icon {
    color: #868e96;
    font-size: 14px;
    cursor: help;
    margin-left: 4px;
    width: 16px;
    height: 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;

    &:hover {
      color: #495057;
      background-color: rgba(0, 0, 0, 0.05);
    }
  }
}

// Add this to ensure tooltip is visible
:deep(.ui-tooltip) {
  z-index: 1100;
}
</style>
