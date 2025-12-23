<script lang="ts" setup>
import { UIBlockItem, UIBlockItemTitle } from '@/components/ui'
import type { BackdropGen } from '@/models/gen/backdrop-gen'

defineEmits<{
  gen: BackdropGen
}>()
</script>

<template>
  <UIBlockItem>
    <UIBlockItemTitle size="large">backdrop</UIBlockItemTitle>
  </UIBlockItem>
</template>

<style lang="scss" scoped></style>
