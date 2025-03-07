<script setup lang="ts">
import { ref } from 'vue'

defineOptions({
  name: 'ThinkingView'
})

const isExpanded = ref(true)

const toggleThinking = () => {
  isExpanded.value = !isExpanded.value
}
</script>

<template>
  <div class="thinking-wrapper">
    <button class="thinking-toggle" @click="toggleThinking">
      {{ isExpanded ? '▼' : '▶' }} Thinking
    </button>
    <span v-show="isExpanded" class="thinking">
      <slot />
    </span>
  </div>
</template>

<style scoped>
.thinking-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.thinking-toggle {
  align-self: flex-start;
  padding: 2px 8px;
  border: none;
  border-radius: 4px;
  background-color: var(--ui-color-grey-100);
  color: var(--ui-color-grey-700);
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
}

.thinking-toggle:hover {
  background-color: var(--ui-color-grey-200);
}

.thinking {
  display: inline-block;
  padding: 8px 8px;
  border-radius: 9px;
  color: #626262;
  background-color: #f5f5f4;
}
</style>
