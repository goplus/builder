<script setup lang="ts">
import { useSlotTextLegacy } from '@/utils/vnode'
import { computed, ref } from 'vue'
import MarkdownView from './MarkdownView.vue'

const props = defineProps<{
  /**
   * File path
   */
  file?: string

  /**
   * Diagnostic content (optional, can also be obtained from slot)
   */
  content?: string
}>()

const slotText = useSlotTextLegacy()
const diagnosticContent = computed(() => props.content || slotText.value)

// Extract filename from file path
const fileName = computed(() => {
  if (!props.file) return 'Unknown file'
  return props.file.split('/').pop() || props.file
})

// Control whether diagnostic information is expanded
const isExpanded = ref(false)

// Analyze the number of errors in the diagnostic information
const errorCount = computed(() => {
  const content = diagnosticContent.value
  if (!content) return 0

  // Count diagnostic lines
  const lines = content.split('\n').filter((line) => line.trim().startsWith('-'))
  // Don't count "No diagnostics" lines
  return lines.filter((line) => !line.includes('No diagnostics')).length
})

// Toggle expand/collapse state
const toggleExpand = () => {
  isExpanded.value = !isExpanded.value
}
</script>

<template>
  <div class="file-diagnostics" :class="{ 'has-errors': errorCount > 0 }">
    <div class="diagnostics-header" @click="toggleExpand">
      <div class="file-info">
        <span class="file-name">{{ fileName }}</span>
        <span v-if="errorCount > 0" class="error-count">{{ errorCount }} issue{{ errorCount > 1 ? 's' : '' }}</span>
        <span v-else class="no-errors">No issues</span>
      </div>
      <div class="expand-toggle">
        {{ isExpanded ? '收起' : '查看详情' }}
        <span class="toggle-icon">{{ isExpanded ? '▲' : '▼' }}</span>
      </div>
    </div>

    <div v-show="isExpanded" class="diagnostics-content">
      <!-- Use MarkdownView to render diagnostic content -->
      <MarkdownView :value="diagnosticContent" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.file-diagnostics {
  margin: 0.75rem 0;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--ui-color-grey-300);

  &.has-errors {
    border-color: var(--ui-color-error-light);
  }

  .diagnostics-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background-color: var(--ui-color-grey-200);
    cursor: pointer;
    user-select: none;

    .has-errors & {
      background-color: var(--ui-color-error-bg);
    }

    &:hover {
      background-color: var(--ui-color-grey-300);

      .has-errors & {
        background-color: var(--ui-color-error-hover);
      }
    }

    .file-info {
      display: flex;
      align-items: center;
      gap: 8px;

      .file-name {
        font-weight: 600;
        font-family: var(--ui-font-family-code);
      }

      .error-count {
        color: var(--ui-color-error-main);
        font-size: 0.85rem;
        padding: 2px 6px;
        background-color: var(--ui-color-error-bg);
        border-radius: 4px;
      }

      .no-errors {
        color: var(--ui-color-success-main);
        font-size: 0.85rem;
      }
    }

    .expand-toggle {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.85rem;
      color: var(--ui-color-grey-700);

      .toggle-icon {
        font-size: 0.8rem;
      }
    }
  }

  .diagnostics-content {
    padding: 12px;
    background-color: var(--ui-color-grey-100);

    .has-errors & {
      background-color: var(--ui-color-error-bg-light);
    }

    // Ensure Markdown content styles are correct
    :deep(ul) {
      margin: 0;
      padding-left: 20px;
    }

    :deep(li) {
      margin-bottom: 4px;
    }

    :deep(code) {
      background-color: var(--ui-color-grey-200);
      padding: 2px 4px;
      border-radius: 4px;
      font-family: var(--ui-font-family-code);
    }
  }
}
</style>
