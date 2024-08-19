<template>
  <NInputNumber
    class="ui-number-input"
    :placeholder="placeholder || ''"
    :show-button="false"
    :value="value"
    :disabled="disabled"
    :min="min"
    :max="max"
    @update:value="(v) => emit('update:value', v)"
  >
    <template v-if="!!slots.prefix" #prefix>
      <slot name="prefix"></slot>
    </template>
    <template v-if="!!slots.suffix" #suffix>
      <slot name="suffix"></slot>
    </template>
  </NInputNumber>
</template>

<script setup lang="ts">
import { useSlots } from 'vue'
import { NInputNumber } from 'naive-ui'

defineProps<{
  value: number | null
  disabled?: boolean
  min?: number
  max?: number
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:value': [number | null]
}>()

const slots = useSlots()
</script>

<style lang="scss" scoped>
.ui-number-input :deep(> .n-input) {
  // it's not possible to control input's hovered-bg-color with themeOverrides,
  // so we do background color control here
  &:not(.n-input--focus, .n-input--error-status, .n-input--disabled) {
    background-color: var(--ui-color-grey-300);
    &:hover {
      background-color: var(--ui-color-grey-400);
    }
  }
}
</style>
