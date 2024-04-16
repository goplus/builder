<template>
  <NCheckboxGroup v-bind="props" @update:value="(v) => emit('update:value', v as string[])">
    <slot></slot>
  </NCheckboxGroup>
</template>

<script setup lang="ts">
import { NCheckboxGroup } from 'naive-ui'

const props = defineProps<{
  value?: string[]
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:value': [string[]]
}>()
</script>

<style lang="scss" scoped></style>
