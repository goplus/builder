<script lang="ts" setup>
import { UIBlockItem, UIBlockItemTitle } from '@/components/ui'
import type { SpriteGen } from '@/models/gen/sprite-gen'

defineEmits<{
  gen: SpriteGen
}>()
</script>

<template>
  <UIBlockItem>
    <UIBlockItemTitle size="large">sprite</UIBlockItemTitle>
  </UIBlockItem>
</template>

<style lang="scss" scoped></style>
