<script lang="ts" setup>
import { UIBlockItem, UIBlockItemTitle } from '@/components/ui'
import type { SpriteGen } from '@/models/gen/sprite-gen'

defineProps<{
  gen: SpriteGen
}>()
</script>

<template>
  <UIBlockItem>
    <UIBlockItemTitle size="large">{{ gen.settings.name }}</UIBlockItemTitle>
  </UIBlockItem>
</template>

<style lang="scss" scoped></style>
