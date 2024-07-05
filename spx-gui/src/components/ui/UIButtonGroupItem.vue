<template>
  <div
    :class="['ui-button-group-item', { active: isActive }, `type-${type()}`]"
    @click="handleClick"
  >
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'
import {
  selectedValueInjectionKey,
  typeInjectionKey,
  updateValueInjectionKey
} from './UIButtonGroup.vue'

const props = defineProps<{
  value: string
}>()

const selectedValue = inject(selectedValueInjectionKey)
const updateValue = inject(updateValueInjectionKey)
const type = inject(typeInjectionKey, () => 'icon')

const isActive = computed(() => selectedValue?.() === props.value)

const handleClick = () => {
  if (!isActive.value) {
    updateValue?.(props.value)
  }
}
</script>

<style scoped lang="scss">
.ui-button-group-item {
  height: var(--ui-line-height-2);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ui-color-grey-300);
  cursor: pointer;
  color: var(--ui-color-grey-1000);

  &.type-icon {
    min-width: 32px;
  }
  &.type-text {
    padding: 0 12px;
  }

  &.active {
    color: var(--ui-color-primary-400);
    background: var(--ui-color-primary-200);
    cursor: default;
  }

  &:first-child {
    border-radius: 12px 0px 0px 12px;
  }

  &:last-child {
    border-radius: 0px 12px 12px 0px;
  }
}
</style>
