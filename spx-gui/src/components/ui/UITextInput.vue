<template>
  <NInput class="ui-text-input" :value="value" @update:value="(v) => emit('update:value', v)">
    <template v-if="label != null" #prefix>
      {{ label }}
    </template>
  </NInput>
</template>

<script setup lang="ts">
import { NInput } from 'naive-ui'

defineProps<{
  value: string
  label?: string
}>()

const emit = defineEmits<{
  'update:value': [string]
}>()
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
