<!-- The item (in animation list) standing for an animation-generation -->

<script lang="ts" setup>
import { UIBlockItem, UIBlockItemTitle } from '@/components/ui'
import type { AnimationGen } from '@/models/gen/animation-gen'

defineEmits<{
  gen: AnimationGen
}>()
</script>

<template>
  <UIBlockItem>
    <UIBlockItemTitle size="large">animation</UIBlockItemTitle>
  </UIBlockItem>
</template>

<style lang="scss" scoped></style>
