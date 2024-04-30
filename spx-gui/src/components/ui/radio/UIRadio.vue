<template>
  <NRadio v-bind="props" @update:checked="(v) => emit('update:checked', v)">
    <slot></slot>
  </NRadio>
</template>

<script setup lang="ts">
import { NRadio } from 'naive-ui'

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
