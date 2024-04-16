<template>
  <NInput :value="value" @update:value="v => emit('update:value', v)" >
    <slot></slot>
  </NInput>
</template>

<script setup lang="ts">
import { NInput } from 'naive-ui'

defineProps<{
  value: string
}>()

const emit = defineEmits<{
  'update:value': [string]
}>()
</script>

<style lang="scss" scoped>
</style>
