<template>
  <NRadioGroup v-bind="props" @update:value="(v) => emit('update:value', v)">
    <slot></slot>
  </NRadioGroup>
</template>

<script setup lang="ts">
import { NRadioGroup } from 'naive-ui'

const props = defineProps<{
  value?: string | null
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:value': [string | null]
}>()
</script>

<style lang="scss" scoped></style>
