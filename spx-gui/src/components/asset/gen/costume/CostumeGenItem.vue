<script lang="ts" setup>
import { UIBlockItem, UIBlockItemTitle } from '@/components/ui'
import type { CostumeGen } from '@/models/gen/costume-gen'

defineEmits<{
  gen: CostumeGen
}>()
</script>

<template>
  <UIBlockItem>
    <UIBlockItemTitle size="large">costume</UIBlockItemTitle>
  </UIBlockItem>
</template>

<style lang="scss" scoped></style>
