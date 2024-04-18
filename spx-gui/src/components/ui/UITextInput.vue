<template>
  <NInput class="ui-text-input" :value="value" @update:value="(v) => emit('update:value', v)">
    <template v-if="!!slots.prefix" #prefix>
      <slot name="prefix"></slot>
    </template>
  </NInput>
</template>

<script setup lang="ts">
import { useSlots } from 'vue'
import { NInput } from 'naive-ui'

defineProps<{
  value: string
}>()

const emit = defineEmits<{
  'update:value': [string]
}>()

const slots = useSlots()
</script>

<style lang="scss" scoped>
.ui-text-input {
  // it's not possible to control input's hovered-bg-color with themeOverrides,
  // so we do background color control here
  &:not(.n-input--focus, .n-input--error-status) {
    background-color: var(--ui-color-grey-300);
    &:hover {
      background-color: var(--ui-color-grey-400);
    }
  }
}
</style>
