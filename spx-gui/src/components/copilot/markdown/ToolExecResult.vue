<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  server?: string
  tool?: string
  arguments?: string
  id?: string
}>()

const isExpanded = ref(false)

// 用于控制显示与隐藏
const toggleExpand = () => {
  isExpanded.value = !isExpanded.value
}
</script>

<template>
  <div class="tool-exec-result">
    <div class="result-header" @click="toggleExpand">
      <div class="tool-info">
        <span v-if="tool" class="tool-name">{{ tool }}</span>
        <span v-if="server" class="tool-server">({{ server }})</span>
      </div>
      <div class="expand-toggle">
        {{ isExpanded ? '收起结果' : '查看结果' }}
        <span class="toggle-icon">{{ isExpanded ? '▲' : '▼' }}</span>
      </div>
    </div>

    <div v-show="isExpanded" class="result-content">
      <pre><slot></slot></pre>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.tool-exec-result {
  border: 1px solid var(--ui-color-grey-400);
  border-radius: 4px;
  margin: 8px 0;
  overflow: hidden;

  .result-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background-color: var(--ui-color-grey-200);
    cursor: pointer;
    user-select: none;

    &:hover {
      background-color: var(--ui-color-grey-300);
    }

    .tool-info {
      display: flex;
      gap: 4px;

      .tool-name {
        font-weight: 600;
      }

      .tool-server {
        color: var(--ui-color-grey-700);
        font-size: 0.9em;
      }
    }

    .expand-toggle {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.9em;
      color: var(--ui-color-grey-700);

      .toggle-icon {
        font-size: 0.8em;
      }
    }
  }

  .result-content {
    padding: 12px;
    background-color: var(--ui-color-grey-100);
    overflow: auto;
    max-height: 400px;
    transition: max-height 0.3s ease-in-out;

    &.hidden {
      max-height: 0;
      padding: 0;
      overflow: hidden;
    }

    pre {
      margin: 0;
      font-family: var(--ui-font-family-code);
      font-size: 0.9em;
      white-space: pre-wrap;
      word-break: break-all;
    }
  }
}
</style>
