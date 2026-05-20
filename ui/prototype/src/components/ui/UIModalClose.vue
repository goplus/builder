<template>
  <button type="button" class="ui-modal-close" :class="sizeClass" aria-label="Close" v-html="closeIcon"></button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import closeIcon from '@/assets/editor/ui-icons/close.svg?raw'

const props = withDefaults(
  defineProps<{
    size?: 'medium' | 'large'
  }>(),
  {
    size: 'medium'
  }
)

const sizeClass = computed(() => (props.size === 'large' ? 'large' : 'medium'))
</script>

<style scoped>
.ui-modal-close {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--ui-color-grey-800);
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

.ui-modal-close.medium {
  width: 28px;
  height: 28px;
}

.ui-modal-close.large {
  width: 32px;
  height: 32px;
}

.ui-modal-close:hover {
  background: var(--ui-color-grey-400);
}

.ui-modal-close:active {
  background: var(--ui-color-grey-500);
}

.ui-modal-close :deep(svg) {
  width: 20px;
  height: 20px;
}

.ui-modal-close.large :deep(svg) {
  width: 24px;
  height: 24px;
}
</style>
