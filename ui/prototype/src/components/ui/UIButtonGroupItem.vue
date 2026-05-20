<template>
  <button :class="rootClass" type="button" :aria-pressed="isActive" @click="handleClick">
    <slot></slot>
  </button>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'

import {
  selectedValueInjectionKey,
  typeInjectionKey,
  updateValueInjectionKey,
  variantInjectionKey
} from './UIButtonGroup.vue'

const props = defineProps<{
  value: string
}>()

const selectedValue = inject(selectedValueInjectionKey)
const updateValue = inject(updateValueInjectionKey)
const type = inject(typeInjectionKey, () => 'icon' as const)
const variant = inject(variantInjectionKey, () => 'primary' as const)

const isActive = computed(() => selectedValue?.() === props.value)

const rootClass = computed(() => [
  'ui-button-group-item',
  `ui-button-group-item-${variant()}`,
  `ui-button-group-item-${type()}`,
  isActive.value ? 'active' : 'inactive'
])

function handleClick() {
  if (!isActive.value) {
    updateValue?.(props.value)
  }
}
</script>

<style scoped>
.ui-button-group-item {
  height: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  font: inherit;
  transition:
    background-color 0.2s,
    color 0.2s,
    box-shadow 0.2s;
}

.ui-button-group-item-icon.ui-button-group-item-primary {
  width: 32px;
}

.ui-button-group-item-text.ui-button-group-item-primary {
  padding: 0 12px;
}

.ui-button-group-item-icon.ui-button-group-item-secondary {
  width: 36px;
}

.ui-button-group-item-text.ui-button-group-item-secondary {
  padding: 0 12px;
}

.ui-button-group-item-primary {
  background: var(--ui-color-grey-300);
  color: var(--ui-color-grey-1000);
}

.ui-button-group-item-primary.active {
  background: var(--ui-color-primary-200);
  color: var(--ui-color-primary-400);
  cursor: default;
}

.ui-button-group-item-primary.inactive {
  cursor: pointer;
}

.ui-button-group-item-secondary {
  height: 28px;
  background: transparent;
  color: var(--ui-color-grey-800);
}

.ui-button-group-item-secondary.active {
  border-radius: calc(var(--ui-border-radius-md) - 2px);
  background: var(--ui-color-grey-100);
  color: var(--ui-color-grey-1000);
  box-shadow: var(--ui-shadow-control);
  cursor: default;
}

.ui-button-group-item-secondary.inactive {
  cursor: pointer;
}

.ui-button-group-item-secondary.inactive:hover {
  color: var(--ui-color-grey-1000);
}
</style>
