<template>
  <NFormItem :label="label" :path="path">
    <slot></slot>
  </NFormItem>
</template>

<script setup lang="ts">
import { NFormItem } from 'naive-ui'

defineProps<{
  label?: string
  path?: string
}>()
</script>

<style lang="scss" scoped>
</style>
