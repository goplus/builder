<template>
  <NCheckbox v-bind="props" @update:checked="(v) => emit('update:checked', v)">
    <slot></slot>
  </NCheckbox>
</template>

<script setup lang="ts">
import { NCheckbox } from 'naive-ui'

const props = defineProps<{
  checked?: boolean
  value?: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:checked': [boolean]
}>()
</script>

<style lang="scss" scoped></style>
