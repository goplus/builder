<template>
  <div
    :class="['ui-button-group-item', { active: isActive }, `variant-${variant()}`, `type-${type()}`]"
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
  updateValueInjectionKey,
  variantInjectionKey
} from './UIButtonGroup.vue'

const props = defineProps<{
  value: string
}>()

const selectedValue = inject(selectedValueInjectionKey)
const updateValue = inject(updateValueInjectionKey)
const type = inject(typeInjectionKey, () => 'icon')
const variant = inject(variantInjectionKey, () => 'primary')

const isActive = computed(() => selectedValue?.() === props.value)

const handleClick = () => {
  if (!isActive.value) {
    updateValue?.(props.value)
  }
}
</script>

<style scoped lang="scss">
.ui-button-group-item {
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &.variant {
    &-primary {
      background-color: var(--ui-color-grey-400);
      color: var(--ui-color-grey-1000);
      &.active {
        background-color: var(--ui-color-grey-100);
        color: var(--ui-color-grey-1000);
      }
    }

    &-secondary {
      background-color: var(--ui-color-grey-400);
      color: var(--ui-color-grey-1000);
      &.active {
        background-color: var(--ui-color-grey-100);
        color: var(--ui-color-grey-1000);
      }
    }
  }

  &.type-icon {
    min-width: 32px;
  }
  &.type-text {
    padding: 0 5px;
  }

  &.active {
    cursor: default;
    border-radius: 4px;
  }

  // &:first-child {
  //   border-radius: 12px 0px 0px 12px;
  // }

  // &:last-child {
  //   border-radius: 0px 12px 12px 0px;
  // }
}
</style>
