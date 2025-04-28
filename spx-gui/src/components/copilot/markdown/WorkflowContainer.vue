<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCopilotCtx } from '@/components/copilot/CopilotProvider.vue'

defineProps<{
  /**
   * Workflow name
   */
  wname?: string

  /**
   * Workflow description (optional)
   */
  description?: string
}>()

// Get copilot context to access collector
const copilotCtx = useCopilotCtx()

// Get the collector from context
const collector = computed(() => copilotCtx.mcp?.collector)

// Get environment variables
const environment = computed(() => {
  if (!collector.value) return {}
  return collector.value.getEnvironment()
})

// Control environment panel visibility
const showEnvPanel = ref(false)

// Toggle environment panel
const toggleEnvPanel = () => {
  showEnvPanel.value = !showEnvPanel.value
}

// Format env value for display
const formatEnvValue = (value: any): string => {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'

  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch (e) {
      return String(value)
    }
  }

  return String(value)
}

// Count environment variables
const envCount = computed(() => {
  return Object.keys(environment.value).length
})
</script>

<template>
  <div class="workflow-container">
    <!-- Workflow header with name and environment -->
    <div class="workflow-header">
      <div class="workflow-title">
        <span v-if="wname" class="workflow-name">{{ wname }}</span>
        <span v-else class="workflow-name">Workflow</span>
        <span v-if="description" class="workflow-description">{{ description }}</span>
      </div>

      <div class="env-button" :class="{ active: showEnvPanel }" @click="toggleEnvPanel">
        <div class="env-icon">Env</div>
        <div v-if="envCount > 0" class="env-count">{{ envCount }}</div>
      </div>
    </div>

    <!-- Environment variables panel -->
    <div v-if="showEnvPanel" class="env-panel">
      <div v-if="envCount > 0" class="env-variables">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(value, key) in environment" :key="key">
              <td class="env-name">{{ key }}</td>
              <td class="env-value">{{ formatEnvValue(value) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="env-empty">No environment variables set</div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.workflow-container {
  margin: 1rem 0;
  border: 1px solid var(--ui-color-grey-300);
  border-radius: 8px;
  overflow: hidden;
  background-color: var(--ui-color-grey-100);

  .workflow-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background-color: var(--ui-color-grey-200);
    border-bottom: 1px solid var(--ui-color-grey-300);

    .workflow-title {
      display: flex;
      align-items: center;
      gap: 8px;

      .workflow-name {
        font-weight: 600;
        color: var(--ui-color-grey-900);
      }

      .workflow-description {
        color: var(--ui-color-grey-700);
        font-size: 0.9em;
      }
    }

    .env-button {
      display: flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;

      &:hover {
        background-color: var(--ui-color-grey-300);
      }

      &.active {
        background-color: var(--ui-color-primary-100);
        color: var(--ui-color-primary-700);
      }

      .env-icon {
        height: 24px;
        width: 24px;
        display: flex;
        justify-content: center;
        align-items: center;
        font-size: 0.7rem;
        font-weight: 600;
        background-color: var(--ui-color-grey-400);
        color: var(--ui-color-grey-900);
        border-radius: 4px;

        .active & {
          background-color: var(--ui-color-primary-200);
          color: var(--ui-color-primary-900);
        }
      }

      .env-count {
        font-size: 0.8rem;
        font-weight: 600;
        min-width: 16px;
        height: 16px;
        border-radius: 8px;
        background-color: var(--ui-color-primary-500);
        color: white;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 0 4px;
      }
    }
  }

  .env-panel {
    padding: 8px;
    background-color: var(--ui-color-grey-150);
    border-bottom: 1px solid var(--ui-color-grey-300);

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9em;

      th,
      td {
        text-align: left;
        padding: 6px 8px;
      }

      th {
        background-color: var(--ui-color-grey-200);
        font-weight: 600;
        color: var(--ui-color-grey-800);
      }

      tr:nth-child(odd) {
        background-color: var(--ui-color-grey-100);
      }

      tr:hover {
        background-color: var(--ui-color-grey-200);
      }

      .env-name {
        font-family: var(--ui-font-family-code);
        color: var(--ui-color-primary-700);
        width: 30%;
        word-break: break-all;
      }

      .env-value {
        font-family: var(--ui-font-family-code);
        color: var(--ui-color-grey-800);
        word-break: break-all;
      }
    }

    .env-empty {
      padding: 12px;
      text-align: center;
      color: var(--ui-color-grey-600);
      font-style: italic;
    }
  }
}
</style>
