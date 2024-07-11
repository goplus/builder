<template>
  <UIBlockItem color="primary" class="asset-item" :active="selected">
    <slot></slot>
    <UICornerIcon v-show="selected" type="check" />
  </UIBlockItem>
</template>

<script setup lang="ts">
import { UIBlockItem, UICornerIcon } from '@/components/ui'

defineProps<{
  selected: boolean
}>()
</script>

<style lang="scss" scoped>
.asset-item {
  width: 140px;
  height: 140px;
}
</style>
