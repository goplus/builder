<!-- The item (in animation list) standing for an animation-generation -->

<script lang="ts" setup>
import { UIBlockItem, UIBlockItemTitle } from '@/components/ui'
import type { AnimationGen } from '@/models/gen/animation-gen'

defineProps<{
  gen: AnimationGen
  active: boolean
}>()
</script>

<template>
  <UIBlockItem :active="active">
    <UIBlockItemTitle size="large">{{ gen.name }}</UIBlockItemTitle>
  </UIBlockItem>
</template>

<style lang="scss" scoped></style>
