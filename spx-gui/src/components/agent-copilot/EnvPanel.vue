<template>
  <div class="env-panel">
    <div class="env-panel-header">
      <span>Environment Variables</span>
      <button class="close-button" @click="$emit('close')">
        <UIIcon class="icon" type="close" />
      </button>
    </div>
    <div class="env-panel-content">
      <div v-if="Object.keys(environment).length === 0" class="empty-state">No environment variables available</div>
      <table v-else class="env-table">
        <thead>
          <tr>
            <th>Key</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(value, key) in environment" :key="key">
            <td class="key">{{ key }}</td>
            <td class="value">{{ value }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAgentCopilotCtx } from './CopilotProvider.vue'
import { UIIcon } from '@/components/ui'

defineEmits<{
  (e: 'close'): void
}>()

// Get copilot context to access collector
const copilotCtx = useAgentCopilotCtx()

// Get the collector from context
const collector = computed(() => copilotCtx.mcp?.collector)

// Get environment variables
const environment = computed(() => {
  if (!collector.value) return {}
  return collector.value.getEnvironment()
})
</script>

<style lang="scss" scoped>
.env-panel {
  .env-panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background-color: var(--ui-color-grey-100);
    border-bottom: 1px solid var(--ui-color-grey-300);

    span {
      font-size: 14px;
      font-weight: 500;
      color: #000000;
    }

    .close-button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border: none;
      background: none;
      border-radius: 50%;
      color: var(--ui-color-grey-700);
      cursor: pointer;

      &:hover {
        background-color: var(--ui-color-grey-200);
      }

      .icon {
        width: 16px;
        height: 16px;
      }
    }
  }

  .env-panel-content {
    padding: 12px;
    overflow-y: auto;
    max-height: 350px;

    .empty-state {
      color: var(--ui-color-grey-600);
      text-align: center;
      padding: 24px 0;
      font-style: italic;
    }

    .env-table {
      width: 100%;
      border-collapse: collapse;

      th,
      td {
        text-align: left;
        padding: 8px;
        border-bottom: 1px solid var(--ui-color-grey-200);
      }

      th {
        font-weight: 500;
        background-color: var(--ui-color-grey-100);
      }

      .key {
        font-weight: 500;
        max-width: 150px;
        word-break: break-all;
      }

      .value {
        font-family: monospace;
        word-break: break-all;
      }
    }
  }
}
</style>
