<template>
  <NInputNumber :value="value" @update:value="(v) => emit('update:value', v)">
    <slot></slot>
  </NInputNumber>
</template>

<script setup lang="ts">
import { NInputNumber } from 'naive-ui'

defineProps<{
  value: number | null
}>()

const emit = defineEmits<{
  'update:value': [number | null]
}>()
</script>

<style lang="scss" scoped></style>
