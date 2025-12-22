<script lang="ts" setup>
import { UIBlockItem, UIBlockItemTitle } from '@/components/ui'
import type { AnimationItem } from '@/models/gen/sprite-gen'

defineEmits<{
  animationItem: AnimationItem
}>()
</script>

<template>
  <UIBlockItem>
    <UIBlockItemTitle size="large">animation</UIBlockItemTitle>
  </UIBlockItem>
</template>

<style lang="scss" scoped></style>
